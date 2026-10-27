import { validEmail, type EmailStatus, type TripReceipt } from '../src/data/trip-request.ts'
import { renderProfileEmail, EMAIL_TEMPLATE_VERSION } from './email-template.ts'
import type { ProfileId } from './profiles.ts'
import { localDevelopment, type Env, type Io } from './platform.ts'

export type RequestRow = {
  id: string; request_hash: string; retry_token_hash: string; email: string
  profile_json: string; email_status: EmailStatus; email_key: string
  email_payload_json: string | null; first_attempt_at: number | null
  lease_until: number | null; lease_token: string | null; next_retry_at: number | null
  resend_id: string | null; email_error_code: string | null
}
type EmailPayload = { from: string; to: string[]; reply_to: string; subject: string; html: string; text: string; tags: { name: string; value: string }[] }
export const readRequest = (env: Env, id: string) => env.DB.prepare('SELECT * FROM trip_requests WHERE id = ?').bind(id).first<RequestRow>()
const RETRY_WINDOW = 23 * 60 * 60 * 1000
export function receipt(row: RequestRow, now: number): TripReceipt {
  const retryAfterSeconds = Math.max(0, Math.ceil((((row.email_status === 'sending' ? row.lease_until : row.next_retry_at) || 0) - now) / 1000))
  return { requestId: row.id, saved: true, emailStatus: row.email_status,
    canRetry: ['pending','failed','unconfigured','simulated'].includes(row.email_status) || (row.email_status === 'sending' && retryAfterSeconds === 0),
    ...(row.email_error_code ? { errorCode: row.email_error_code } : {}), ...(retryAfterSeconds > 0 ? { retryAfterSeconds } : {}) }
}

function preparePayload(row: RequestRow, env: Env): EmailPayload | null {
  if (!env.RESEND_API_KEY || !env.EMAIL_FROM || !env.REPLY_TO || !env.PUBLIC_SITE_URL || /[\r\n]/.test(env.EMAIL_FROM + env.REPLY_TO)) return null
  const from = env.EMAIL_FROM.match(/^(?:[^<>]+<([^<>]+)>|([^<>\s]+))$/)
  if (!validEmail(env.REPLY_TO.trim()) || !validEmail((from?.[1] || from?.[2] || '').trim())) return null
  try {
    const profile = (JSON.parse(row.profile_json) as { principal: ProfileId }).principal
    const email = renderProfileEmail(profile, env.PUBLIC_SITE_URL, env.WHATSAPP_URL)
    return { from: env.EMAIL_FROM, to: [row.email], reply_to: env.REPLY_TO, ...email, tags: [{ name: 'trip_request', value: row.id }, { name: 'template_version', value: EMAIL_TEMPLATE_VERSION }] }
  } catch { return null }
}

export async function deliverProfile(request: Request, env: Env, id: string, io: Io): Promise<RequestRow> {
  let row = (await readRequest(env, id))!
  const now = io.now()
  if (row.email_status === 'accepted' || row.email_status === 'review_required' || (row.email_status === 'sending' && (row.lease_until || 0) > now) || (row.next_retry_at || 0) > now) return row
  if (row.first_attempt_at !== null && now - row.first_attempt_at >= RETRY_WINDOW) {
    await env.DB.prepare("UPDATE trip_requests SET email_status = 'review_required', email_error_code = 'RETRY_WINDOW_EXPIRED', updated_at = ? WHERE id = ? AND email_status != 'accepted' AND (lease_until IS NULL OR lease_until <= ?)").bind(now, id, now).run()
    return (await readRequest(env, id))!
  }
  const mode = env.EMAIL_MODE || 'disabled'
  const mock = mode === 'mock' && localDevelopment(request, env)
  const real = mode === 'resend' && env.ENVIRONMENT === 'production' && !localDevelopment(request, { ...env, ENVIRONMENT: 'development' })
  const payload = row.email_payload_json ? JSON.parse(row.email_payload_json) as EmailPayload : preparePayload(row, mock ? {
    ...env, RESEND_API_KEY: 'local-mock-not-a-key', EMAIL_FROM: 'Aripajama <preview@example.test>', REPLY_TO: 'preview@example.test', PUBLIC_SITE_URL: 'https://preview.example.test',
  } : env)
  if ((!mock && !real) || !payload || (real && !env.RESEND_API_KEY)) {
    await env.DB.prepare("UPDATE trip_requests SET email_status = 'unconfigured', email_error_code = 'EMAIL_NOT_CONFIGURED', updated_at = ? WHERE id = ? AND email_status != 'accepted' AND (lease_until IS NULL OR lease_until <= ?)").bind(now, id, now).run()
    return (await readRequest(env, id))!
  }
  const lease = crypto.randomUUID()
  const claimed = await env.DB.prepare(`UPDATE trip_requests SET email_status = 'sending', lease_token = ?, lease_until = ?,
    email_payload_json = COALESCE(email_payload_json, ?), first_attempt_at = COALESCE(first_attempt_at, ?),
    email_attempts = email_attempts + 1, email_error_code = NULL, updated_at = ?
    WHERE id = ? AND email_status NOT IN ('accepted','review_required') AND (lease_until IS NULL OR lease_until <= ?)`)
    .bind(lease, now + 45000, JSON.stringify(payload), now, now, id, now).run()
  if (!claimed.meta.changes) return (await readRequest(env, id))!
  // Always use the persisted payload, including after environment/template changes.
  row = (await readRequest(env, id))!
  let status: EmailStatus = mock ? 'simulated' : 'failed'
  let providerId: string | null = null
  let error: string | null = null
  let nextRetry = now + 5000
  if (!mock) {
    try {
      const response = await io.fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': row.email_key },
        body: row.email_payload_json!, signal: AbortSignal.timeout(12000),
      })
      const data = await response.json() as { id?: unknown }
      if (response.ok && typeof data.id === 'string' && data.id.length > 0 && data.id.length < 200) { status = 'accepted'; providerId = data.id }
      else {
        error = response.status === 401 || response.status === 403 ? 'PROVIDER_CONFIGURATION' : response.status === 409 ? 'PROVIDER_CONFLICT' : response.status === 429 ? 'PROVIDER_RATE_LIMIT' : 'PROVIDER_ERROR'
        const seconds = Number(response.headers.get('Retry-After'))
        if (response.status === 429) nextRetry = now + Math.max(5, Math.min(Number.isFinite(seconds) ? seconds : 60, 3600)) * 1000
      }
    } catch { error = 'PROVIDER_UNCONFIRMED' }
  }
  await env.DB.prepare(`UPDATE trip_requests SET email_status = ?, resend_id = ?, email_error_code = ?, lease_token = NULL,
    lease_until = NULL, next_retry_at = ?, updated_at = ? WHERE id = ? AND lease_token = ?`)
    .bind(status, providerId, error, status === 'failed' ? nextRetry : null, io.now(), id, lease).run()
  return (await readRequest(env, id))!
}
