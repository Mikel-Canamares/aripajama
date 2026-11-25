import { validEmail, type TripReceipt } from '../src/data/trip-request.ts'
import type { Env } from './platform.ts'
import type { ProfileId } from './profiles.ts'
import { bookingOptions } from './booking-link.ts'

export type RequestRow = {
  id: string; request_hash: string; retry_token_hash: string; email: string | null
  profile_json: string; email_status: string; email_key: string
  email_payload_json: string | null; first_attempt_at: number | null
  lease_until: number | null; lease_token: string | null; next_retry_at: number | null
  resend_id: string | null; email_error_code: string | null
  booking_reference: string | null; answers_json: string; details_json: string
  created_at: number
}
export type EmailPayload = { from: string; to: string[]; reply_to: string; subject: string; html: string; text: string; tags: { name: string; value: string }[] }
export const readRequest = (env: Env, id: string) => env.DB.prepare('SELECT * FROM trip_requests WHERE id = ?').bind(id).first<RequestRow>()
export function receipt(row: RequestRow, env: Env): TripReceipt {
  const profile = JSON.parse(row.profile_json) as { principal: ProfileId }
  return { requestId: row.id, saved: true, profile: profile.principal, booking: bookingOptions(env, row.booking_reference, row.email) }
}

export function testRecipientsAllowed(payload: EmailPayload, env: Pick<Env, 'EMAIL_TEST_RECIPIENTS'>): boolean {
  const allowed = new Set((env.EMAIL_TEST_RECIPIENTS || '').split(',')
    .map(email => email.trim().toLowerCase()).filter(validEmail))
  return Array.isArray(payload.to) && payload.to.length > 0 && payload.to.every(email =>
    typeof email === 'string' && allowed.has(email.trim().toLowerCase()))
}
