import type { Env, Io } from './platform.ts'

export async function sendEmail(env: Env, io: Io, key: string, payload: string, attempts: number, mock: boolean) {
  const now = io.now()
  let status = mock ? 'simulated' : 'failed'
  let providerId: string | null = null
  let error: string | null = null
  let nextRetry = now + Math.min(60 * 2 ** (attempts - 1), 3600) * 1000
  if (!mock) {
    try {
      const response = await io.fetch('https://api.resend.com/emails', {
        method: 'POST', headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
        body: payload, signal: AbortSignal.timeout(12000),
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
  return { status, providerId, error, nextRetry }
}
