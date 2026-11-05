import { ApiError, type Env } from './platform.ts'

export const TEST_OWNER = 'mikel.canamares@gmail.com'
// Published Cloudflare dummy keys: never credentials and never used in live mode.
export const TEST_SITE_KEY = '1x00000000000000000000AA'
export const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA'
export function phaseOneTestMode(env: Env): boolean {
  if (env.PHASE1_TEST_MODE !== 'true' || env.ENVIRONMENT !== 'production') return false
  const recipients = (env.EMAIL_TEST_RECIPIENTS || '').split(',').map(value => value.trim().toLowerCase()).filter(Boolean)
  if (env.EMAIL_MODE !== 'resend' || env.EMAIL_TEST_RESTRICTED !== 'true' ||
    recipients.length !== 1 || recipients[0] !== TEST_OWNER || env.ARIANA_EMAIL?.trim().toLowerCase() !== TEST_OWNER ||
    env.BOOKING_NOTIFICATIONS_ENABLED !== 'true' || !/^[a-f0-9]{64}$/.test(env.SESSION_TEST_SIGNING_KEY || '')) {
    throw new ApiError(503, 'TEST_MODE_NOT_CONFIGURED')
  }
  return true
}
export function restrictTestOwner(env: Env, email: string) {
  if (phaseOneTestMode(env) && email.trim().toLowerCase() !== TEST_OWNER) throw new ApiError(403, 'TEST_RECIPIENT_NOT_ALLOWED')
}
async function signingKey(env: Env) {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(env.SESSION_TEST_SIGNING_KEY!), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign','verify'])
}
const data = (reference: string, expires: string) => new TextEncoder().encode(`phase1-session:${reference}:${expires}`)
export async function sessionTestLink(env: Env, reference: string | null, createdAt: number) {
  if (!phaseOneTestMode(env) || !reference || !/^[a-f0-9]{64}$/.test(reference)) return undefined
  const expires = String(createdAt + 7 * 86400000)
  const signature = [...new Uint8Array(await crypto.subtle.sign('HMAC', await signingKey(env), data(reference, expires)))].map(byte => byte.toString(16).padStart(2,'0')).join('')
  const url = new URL(`/api/session-test/${reference}`, env.PUBLIC_SITE_URL)
  if (url.protocol !== 'https:' || url.username || url.password) throw new ApiError(503, 'TEST_MODE_NOT_CONFIGURED')
  url.searchParams.set('expires', expires); url.searchParams.set('signature', signature)
  return url.href
}
export async function verifySessionTestLink(env: Env, url: URL, reference: string, now: number) {
  if (!phaseOneTestMode(env)) return false
  const expires = url.searchParams.get('expires') || '', signature = url.searchParams.get('signature') || ''
  if (url.origin !== new URL(env.PUBLIC_SITE_URL!).origin || !/^\d{13}$/.test(expires) || Number(expires) <= now ||
    !/^[a-f0-9]{64}$/.test(signature) || [...url.searchParams.keys()].some(key => !['expires','signature'].includes(key)) ||
    url.searchParams.getAll('expires').length !== 1 || url.searchParams.getAll('signature').length !== 1) return false
  const bytes = new Uint8Array(signature.match(/../g)!.map(value => parseInt(value,16)))
  return crypto.subtle.verify('HMAC', await signingKey(env), bytes, data(reference,expires))
}
