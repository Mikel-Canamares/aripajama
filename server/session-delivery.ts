import { readRequest, testRecipientsAllowed, type EmailPayload } from './delivery.ts'
import { defaultIo, digest, type Env, type Io } from './platform.ts'
import { eligibleBooking, readBooking, type BookingRow } from './sessions.ts'
import { renderSessionEmail } from './session-email.ts'
import { validEmail } from '../src/data/trip-request.ts'
import { phaseOneTestMode } from './test-mode.ts'

type Notification = {
  booking_uid: string; status: string; email_key: string; payload_json: string | null; payload_revision: string | null
  first_attempt_at: number | null; attempts: number; next_retry_at: number | null; lease_token: string | null; lease_until: number | null
  resend_id: string | null; error_code: string | null
}
const WINDOW = 23 * 60 * 60 * 1000
const LIMIT = 8
const readNotification = (env: Env, uid: string) => env.DB.prepare('SELECT * FROM session_notifications WHERE booking_uid = ?').bind(uid).first<Notification>()
const contentRevision = (booking: BookingRow) => digest(JSON.stringify([
  booking.request_id, booking.appointment_json, booking.booking_status, booking.payment_status,
  booking.payment_id, booking.amount_cents, booking.currency, booking.review_required,
  booking.is_test,
]))

async function payloadFor(env: Env, booking: BookingRow, mock: boolean): Promise<EmailPayload | null> {
  const request = await readRequest(env, booking.request_id)
  const from = mock ? 'Aripajama <preview@example.test>' : env.EMAIL_FROM || ''
  const reply = mock ? 'preview@example.test' : env.REPLY_TO || ''
  const to = env.ARIANA_EMAIL || (mock ? 'ariana@example.test' : '')
  const sender = from.match(/^(?:[^<>]+<([^<>]+)>|([^<>\s]+))$/)
  if (!request || !validEmail(to) || !validEmail(reply) || /[\r\n]/.test(from + reply + to) ||
    !validEmail((sender?.[1] || sender?.[2] || '').trim())) return null
  return { from, to: [to], reply_to: reply, ...renderSessionEmail(request, booking),
    tags: [{ name: 'template_version', value: 'paid-session-v1' }] }
}

export async function deliverSessionNotification(env: Env, uid: string, io: Io = defaultIo) {
  if (env.BOOKING_NOTIFICATIONS_ENABLED !== 'true') return
  const row = await readNotification(env, uid)
  if (!row || ['accepted','review_required','suppressed','simulated'].includes(row.status)) return
  const now = io.now()
  if ((row.lease_until || 0) > now || (row.next_retry_at || 0) > now) return
  const setIdle = async (status: string, code: string) => {
    await env.DB.prepare(`UPDATE session_notifications SET status = ?, error_code = ?, lease_token = NULL, lease_until = NULL,
      next_retry_at = NULL, updated_at = ? WHERE booking_uid = ? AND status NOT IN ('accepted','review_required','suppressed','simulated')
      AND (lease_until IS NULL OR lease_until <= ?)`)
      .bind(status, code, now, uid, now).run()
  }
  if (row.first_attempt_at !== null && (now - row.first_attempt_at >= WINDOW || row.attempts >= LIMIT)) {
    await setIdle('review_required', row.attempts >= LIMIT ? 'ATTEMPTS_EXHAUSTED' : 'RETRY_WINDOW_EXPIRED'); return
  }
  const booking = await readBooking(env, uid)
  if (!booking || booking.booking_status === 'cancelled') { await setIdle('suppressed', 'BOOKING_CANCELLED'); return }
  if (booking.is_test && !phaseOneTestMode(env)) { await setIdle('suppressed', 'TEST_MODE_DISABLED'); return }
  if (!eligibleBooking(booking)) { await setIdle('review_required', 'BOOKING_NOT_ELIGIBLE'); return }
  const revision = await contentRevision(booking)
  if (row.payload_revision && row.payload_revision !== revision) { await setIdle('review_required', 'BOOKING_CHANGED_AFTER_ATTEMPT'); return }
  const mock = env.EMAIL_MODE === 'mock' && env.ENVIRONMENT === 'development'
  const real = env.EMAIL_MODE === 'resend' && env.ENVIRONMENT === 'production'
  if ((!mock && !real) || (real && !env.RESEND_API_KEY)) { await setIdle('unconfigured', 'EMAIL_NOT_CONFIGURED'); return }
  let payload: EmailPayload | null
  try { payload = row.payload_json ? JSON.parse(row.payload_json) as EmailPayload : await payloadFor(env, booking, mock) }
  catch { await setIdle('review_required', 'EMAIL_CONTENT_INVALID'); return }
  if (!payload) { await setIdle('unconfigured', 'EMAIL_NOT_CONFIGURED'); return }
  if (real && env.EMAIL_TEST_RESTRICTED !== 'false' && !testRecipientsAllowed(payload, env)) {
    await setIdle('unconfigured', 'EMAIL_RECIPIENT_NOT_ALLOWED'); return
  }
  const lease = crypto.randomUUID()
  const claimed = await env.DB.prepare(`UPDATE session_notifications SET status = 'sending', lease_token = ?, lease_until = ?,
    payload_json = COALESCE(payload_json, ?), payload_revision = COALESCE(payload_revision, ?),
    first_attempt_at = COALESCE(first_attempt_at, ?), attempts = attempts + 1, error_code = NULL, updated_at = ?
    WHERE booking_uid = ? AND status IN ('pending','failed','unconfigured','sending') AND (lease_until IS NULL OR lease_until <= ?)
    AND (next_retry_at IS NULL OR next_retry_at <= ?) AND attempts < ? AND (first_attempt_at IS NULL OR first_attempt_at > ?)
    AND EXISTS (SELECT 1 FROM session_bookings WHERE uid = ? AND revision = ? AND review_required = 0 AND booking_status = 'confirmed')`)
    .bind(lease, now + 45000, JSON.stringify(payload), revision, now, now, uid, now, now, LIMIT, now - WINDOW, uid, booking.revision).run()
  if (!claimed.meta.changes) return
  const persisted = (await readNotification(env, uid))!
  const current = await readBooking(env, uid)
  // Last local check before contacting Resend; a cancellation during the external
  // request itself cannot retract an email already accepted by the provider.
  if (!current || !eligibleBooking(current) || await contentRevision(current) !== persisted.payload_revision) {
    await env.DB.prepare(`UPDATE session_notifications SET status = ?, error_code = 'BOOKING_CHANGED_BEFORE_SEND',
      lease_token = NULL, lease_until = NULL, updated_at = ? WHERE booking_uid = ? AND lease_token = ?`)
      .bind(current?.booking_status === 'cancelled' ? 'suppressed' : 'review_required', io.now(), uid, lease).run()
    return
  }
  let status = mock ? 'simulated' : 'failed'
  let providerId: string | null = null
  let error: string | null = null
  let nextRetry = now + Math.min(60 * 2 ** (persisted.attempts - 1), 3600) * 1000
  if (!mock) {
    try {
      const response = await io.fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': persisted.email_key },
        body: persisted.payload_json!, signal: AbortSignal.timeout(12000),
      })
      const data = await response.json() as { id?: unknown; name?: unknown }
      if (response.ok && typeof data.id === 'string' && data.id.length > 0 && data.id.length < 200) { status = 'accepted'; providerId = data.id }
      else if (response.status === 429) {
        error = 'PROVIDER_RATE_LIMIT'
        const retry = response.headers.get('Retry-After')
        const seconds = retry === null ? NaN : Number(retry)
        const retryAt = Number.isFinite(seconds) ? now + Math.max(0, seconds) * 1000 : Date.parse(retry || '')
        if (Number.isFinite(retryAt)) nextRetry = Math.max(nextRetry, retryAt)
      } else if (response.status === 409 && data.name === 'concurrent_idempotent_requests') error = 'PROVIDER_BUSY'
      else if (response.status >= 400 && response.status < 500) { status = 'review_required'; error = 'PROVIDER_CONFIGURATION_OR_CONFLICT' }
      else error = 'PROVIDER_UNCONFIRMED'
    } catch { error = 'PROVIDER_UNCONFIRMED' }
  }
  if (status === 'failed' && (persisted.attempts >= LIMIT || nextRetry >= persisted.first_attempt_at! + WINDOW)) {
    status = 'review_required'; error = persisted.attempts >= LIMIT ? 'ATTEMPTS_EXHAUSTED' : 'RETRY_WINDOW_EXPIRED'
  }
  await env.DB.prepare(`UPDATE session_notifications SET status = ?, resend_id = ?, error_code = ?, lease_token = NULL,
    lease_until = NULL, next_retry_at = ?, updated_at = ? WHERE booking_uid = ? AND lease_token = ?`)
    .bind(status, providerId, error, status === 'failed' ? nextRetry : null, io.now(), uid, lease).run()
}

export async function processSessionNotifications(env: Env, io: Io = defaultIo) {
  if (env.BOOKING_NOTIFICATIONS_ENABLED !== 'true') return
  const due = await env.DB.prepare(`SELECT booking_uid FROM session_notifications WHERE status IN ('pending','failed','unconfigured','sending')
    AND (next_retry_at IS NULL OR next_retry_at <= ?) AND (lease_until IS NULL OR lease_until <= ?)
    ORDER BY updated_at, booking_uid LIMIT 25`).bind(io.now(), io.now()).all<{ booking_uid: string }>()
  for (const row of due.results) {
    try { await deliverSessionNotification(env, row.booking_uid, io) }
    catch { /* A D1 failure leaves the lease for recovery on the next tick; never log personal data. */ }
  }
}
