import { validEmail } from '../src/data/trip-request.ts'
import { configuredBookingPath } from './booking-link.ts'
import { testRecipientsAllowed, type EmailPayload, type RequestRow } from './delivery.ts'
import { ApiError, defaultIo, type Env, type Io } from './platform.ts'
import { sendEmail } from './resend.ts'
import { renderSessionEmail } from './session-email.ts'

const retryWindow = 23 * 60 * 60 * 1000
const maxAttempts = 8
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
const string = (value: unknown, max: number) => typeof value === 'string' && value.trim().length <= max ? value.trim() : ''

function calVideoUrl(value: unknown) {
  try {
    const url = new URL(string(value, 2000))
    const host = url.hostname
    if (url.protocol === 'https:' && !url.username && !url.password && !url.port &&
        (host === 'cal.video' || host.endsWith('.cal.video') ||
         (['app.cal.com', 'cal.com', 'cal.app'].includes(host) && url.pathname.startsWith('/video/')))) return url.href
  } catch { /* Cal.com can generate the room after delivering the booking. */ }
  return null
}

async function verify(secret: string, signature: string | null, bytes: Uint8Array<ArrayBuffer>) {
  if (!signature || !/^[a-f\d]{64}$/i.test(signature)) throw new ApiError(401, 'INVALID_SIGNATURE')
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'])
  const supplied = Uint8Array.from(signature.match(/../g)!, pair => parseInt(pair, 16))
  if (!await crypto.subtle.verify('HMAC', key, supplied, bytes)) throw new ApiError(401, 'INVALID_SIGNATURE')
}

export async function calWebhook(env: Env, signature: string | null, bytes: Uint8Array<ArrayBuffer>, io: Io) {
  const path = configuredBookingPath(env)
  if (!path || env.BOOKING_NOTIFICATIONS_ENABLED !== 'true') throw new ApiError(404, 'NOT_FOUND')
  const to = env.ARIANA_EMAIL?.trim().toLowerCase()
  if (!env.CAL_WEBHOOK_SECRET || !to || !validEmail(to)) throw new ApiError(503, 'CAL_NOT_CONFIGURED')
  await verify(env.CAL_WEBHOOK_SECRET, signature, bytes)
  let event: Record<string, unknown>
  try { event = record(JSON.parse(new TextDecoder().decode(bytes))) }
  catch { throw new ApiError(400, 'INVALID_JSON') }
  const booking = record(event.payload)
  if (event.triggerEvent !== 'BOOKING_CREATED' || booking.status !== 'ACCEPTED') return
  const organizer = record(booking.organizer)
  const [username, slug] = path.split('/')
  if (booking.type !== slug || string(organizer.email, 254).toLowerCase() !== to ||
      (organizer.username && organizer.username !== username)) return

  const metadata = record(booking.metadata)
  const reference = string(metadata.aripajama_reference, 64)
  if (!/^[a-f0-9]{64}$/.test(reference)) return
  const request = await env.DB.prepare('SELECT * FROM trip_requests WHERE booking_reference = ?').bind(reference).first<RequestRow>()
  if (!request) return
  const uid = string(booking.uid, 128)
  const attendee = record(Array.isArray(booking.attendees) ? booking.attendees[0] : null)
  const email = string(attendee.email, 254)
  const start = string(booking.startTime, 64), end = string(booking.endTime, 64)
  if (!/^[a-zA-Z0-9_-]+$/.test(uid) || !validEmail(email) || !Number.isFinite(Date.parse(start)) ||
      !Number.isFinite(Date.parse(end)) || Date.parse(end) <= Date.parse(start)) throw new ApiError(422, 'INVALID_BOOKING')
  const phone = string(attendee.phoneNumber, 64) || string(record(record(booking.responses).attendeePhoneNumber).value, 64) || null
  const mock = env.ENVIRONMENT === 'development' && env.EMAIL_MODE === 'mock'
  const from = env.EMAIL_FROM || (mock ? 'preview@example.test' : '')
  const reply = env.REPLY_TO || (mock ? 'preview@example.test' : '')
  if (!validEmail(reply) || !validEmail(from.match(/<([^<>]+)>$/)?.[1] || from) || /[\r\n]/.test(from + reply)) throw new ApiError(503, 'EMAIL_NOT_CONFIGURED')
  const appointment = { name: string(attendee.name, 200) || null, email, start, end,
    timeZone: string(organizer.timeZone, 100) || 'UTC', attendeeTimeZone: string(attendee.timeZone, 100) || 'UTC',
    videoUrl: calVideoUrl(metadata.videoCallUrl) || calVideoUrl(record(booking.videoCallData).url) }
  const content = renderSessionEmail(request, { uid, appointment_json: JSON.stringify(appointment) }, { phone })
  const payload: EmailPayload = { from, to: [to], reply_to: reply, ...content, tags: [{ name: 'template_version', value: 'cal-booking-v1' }] }
  await env.DB.prepare(`INSERT INTO cal_notification_emails (booking_uid,request_id,payload_json,status,due_at)
    VALUES (?,?,?,'pending',?) ON CONFLICT(booking_uid) DO NOTHING`).bind(uid, request.id, JSON.stringify(payload), io.now()).run()
  await deliverCalEmail(env, uid, io)
}

type Delivery = { payload_json: string; attempts: number; first_attempt_at: number | null }

async function deliverCalEmail(env: Env, uid: string, io: Io) {
  const now = io.now()
  const due = "booking_uid = ? AND status IN ('pending','sending') AND due_at <= ?"
  const row = await env.DB.prepare('SELECT payload_json,attempts,first_attempt_at FROM cal_notification_emails WHERE ' + due)
    .bind(uid, now).first<Delivery>()
  if (!row) return
  const payload = JSON.parse(row.payload_json) as EmailPayload
  const mock = env.ENVIRONMENT === 'development' && env.EMAIL_MODE === 'mock'
  const real = env.ENVIRONMENT === 'production' && env.EMAIL_MODE === 'resend' && !!env.RESEND_API_KEY
  const expired = row.first_attempt_at !== null && now - row.first_attempt_at >= retryWindow
  if (row.attempts >= maxAttempts || expired || payload.to[0] !== env.ARIANA_EMAIL?.trim().toLowerCase()) {
    await env.DB.prepare("UPDATE cal_notification_emails SET status='review_required', lease_token=NULL WHERE " + due).bind(uid, now).run()
    return
  }
  if ((!mock && !real) || (real && env.EMAIL_TEST_RESTRICTED !== 'false' && !testRecipientsAllowed(payload, env))) {
    await env.DB.prepare('UPDATE cal_notification_emails SET due_at=? WHERE ' + due).bind(now + 300000, uid, now).run()
    return
  }
  const lease = crypto.randomUUID()
  const claim = await env.DB.prepare(`UPDATE cal_notification_emails SET status='sending', lease_token=?, due_at=?,
    first_attempt_at=COALESCE(first_attempt_at,?), attempts=attempts+1 WHERE ` + due + ' AND attempts=?')
    .bind(lease, now + 45000, now, uid, now, row.attempts).run()
  if (!claim.meta.changes) return
  const result = await sendEmail(env, io, 'cal-booking/' + uid + '/v1', row.payload_json, row.attempts + 1, mock)
  let status = result.status
  if (status === 'failed') {
    const exhausted = row.attempts + 1 >= maxAttempts || result.nextRetry >= (row.first_attempt_at ?? now) + retryWindow
    status = exhausted ? 'review_required' : 'pending'
  }
  await env.DB.prepare(`UPDATE cal_notification_emails SET status = ?, resend_id = ?, due_at = ?, lease_token = NULL,
    payload_json=CASE WHEN ?='accepted' THEN NULL ELSE payload_json END WHERE booking_uid=? AND lease_token=?`)
    .bind(status, result.providerId, result.nextRetry, status, uid, lease).run()
}

export async function processCalEmails(env: Env, io: Io = defaultIo) {
  if (!configuredBookingPath(env) || env.BOOKING_NOTIFICATIONS_ENABLED !== 'true') return
  const due = await env.DB.prepare(`SELECT booking_uid FROM cal_notification_emails
    WHERE status IN ('pending','sending') AND due_at <= ? ORDER BY due_at LIMIT 25`).bind(io.now()).all<{ booking_uid: string }>()
  for (const row of due.results) {
    try { await deliverCalEmail(env, row.booking_uid, io) }
    catch { /* A failed D1 write is recoverable when the delivery lease expires. */ }
  }
}
