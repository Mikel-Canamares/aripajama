import { normalizeTripDetails, validEmail } from '../src/data/trip-request.ts'
import { ALGORITHM_VERSION, calcularPerfil, InvalidAnswers, mapCurrentAnswers } from './profiles.ts'
import { deliverProfile, readRequest, receipt } from './delivery.ts'
import { ApiError, defaultIo, digest, localDevelopment, type Env, type Io } from './platform.ts'

const ID = /^[a-zA-Z0-9_-]{20,80}$/
const TOKEN = /^[a-zA-Z0-9_-]{40,128}$/
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' } })
async function body(request: Request): Promise<Record<string, unknown>> {
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new ApiError(415, 'JSON_REQUIRED')
  const stream = request.body?.getReader()
  if (!stream) throw new ApiError(400, 'INVALID_JSON')
  const chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const item = await stream.read()
    if (item.done) break
    size += item.value.byteLength
    if (size > 16384) { await stream.cancel(); throw new ApiError(413, 'REQUEST_TOO_LARGE') }
    chunks.push(item.value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try {
    const value = JSON.parse(new TextDecoder().decode(bytes))
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error()
    return value
  } catch { throw new ApiError(400, 'INVALID_JSON') }
}
function checkOrigin(request: Request, env: Env) {
  const origin = request.headers.get('Origin')
  const allowed = env.PUBLIC_SITE_URL ? new URL(env.PUBLIC_SITE_URL).origin : new URL(request.url).origin
  if (!origin || (origin !== allowed && !(localDevelopment(request, env) && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)))) throw new ApiError(403, 'ORIGIN_NOT_ALLOWED')
}
async function verifyTurnstile(request: Request, env: Env, token: unknown, io: Io) {
  if (env.TURNSTILE_MODE === 'mock' && localDevelopment(request, env)) {
    if (token !== 'local-test-token') throw new ApiError(403, 'VERIFICATION_FAILED')
    return
  }
  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY || (env.ENVIRONMENT === 'production' && /^[123]x0+/.test(env.TURNSTILE_SITE_KEY))) throw new ApiError(503, 'VERIFICATION_NOT_CONFIGURED')
  if (typeof token !== 'string' || token.length < 1 || token.length > 2048) throw new ApiError(403, 'VERIFICATION_REQUIRED')
  let valid = false
  try {
    const response = await io.fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }), signal: AbortSignal.timeout(10000),
    })
    const result = await response.json() as { success?: boolean; hostname?: string; action?: string }
    valid = response.ok && result.success === true && result.hostname === new URL(env.PUBLIC_SITE_URL || request.url).hostname && result.action === 'trip_request'
  } catch { throw new ApiError(503, 'VERIFICATION_UNAVAILABLE') }
  if (!valid) throw new ApiError(403, 'VERIFICATION_FAILED')
}
async function limit(request: Request, env: Env) {
  if (!env.REQUEST_LIMITER) {
    if (!localDevelopment(request, env)) throw new ApiError(503, 'RATE_LIMIT_NOT_CONFIGURED')
    return
  }
  const key = await digest(request.headers.get('CF-Connecting-IP') || 'local-development')
  if (!(await env.REQUEST_LIMITER.limit({ key })).success) throw new ApiError(429, 'TOO_MANY_REQUESTS')
}
async function authorize(request: Request, env: Env, id: string) {
  const token = request.headers.get('Authorization')?.replace(/^Bearer /, '') || ''
  if (!TOKEN.test(token)) throw new ApiError(404, 'REQUEST_NOT_FOUND')
  const row = await readRequest(env, id)
  if (!row || row.retry_token_hash !== await digest(token)) throw new ApiError(404, 'REQUEST_NOT_FOUND')
  return row
}

export function createHandler(io: Io = defaultIo) {
  return async (request: Request, env: Env): Promise<Response> => {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS ? env.ASSETS.fetch(request) : new Response('Not found', { status: 404 })
    try {
      if (url.pathname === '/api/trip-config' && request.method === 'GET') return json({ turnstileSiteKey: env.TURNSTILE_SITE_KEY || null, localVerification: env.TURNSTILE_MODE === 'mock' && localDevelopment(request, env) })
      const match = url.pathname.match(/^\/api\/trip-requests\/([a-zA-Z0-9_-]{20,80})(\/retry-email)?$/)
      if (match && !match[2] && request.method === 'GET') return json(receipt(await authorize(request, env, match[1]), io.now()))
      if (match?.[2] && request.method === 'POST') {
        checkOrigin(request, env)
        await limit(request, env)
        const row = await authorize(request, env, match[1])
        if (row.email_status === 'accepted') return json(receipt(row, io.now()))
        const data = await body(request)
        await verifyTurnstile(request, env, data.turnstileToken, io)
        return json(receipt(await deliverProfile(request, env, row.id, io), io.now()))
      }
      if (url.pathname !== '/api/trip-requests') return json({ code: 'NOT_FOUND' }, 404)
      if (request.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405)
      checkOrigin(request, env)
      await limit(request, env)
      const data = await body(request)
      if (Object.keys(data).some(key => !['requestId','retryToken','answers','details','email','consent','turnstileToken','website'].includes(key))) throw new ApiError(422, 'INVALID_REQUEST')
      if (data.website) throw new ApiError(422, 'INVALID_REQUEST')
      if (typeof data.requestId !== 'string' || !ID.test(data.requestId) || typeof data.retryToken !== 'string' || !TOKEN.test(data.retryToken) || data.consent !== true) throw new ApiError(422, 'INVALID_REQUEST')
      if (typeof data.email !== 'string' || !validEmail(data.email.trim())) throw new ApiError(422, 'INVALID_EMAIL')
      const email = data.email.trim().toLowerCase()
      const answers = mapCurrentAnswers(data.answers)
      const details = normalizeTripDetails(data.details)
      const hash = await digest(JSON.stringify({ answers, details, email, consent: true }))
      const tokenHash = await digest(data.retryToken)
      const existing = await readRequest(env, data.requestId)
      if (existing) {
        if (existing.request_hash !== hash || existing.retry_token_hash !== tokenHash) throw new ApiError(409, 'REQUEST_CONFLICT')
        return json(receipt(existing, io.now()))
      }
      await verifyTurnstile(request, env, data.turnstileToken, io)
      const profile = calcularPerfil(answers)
      const now = io.now()
      const inserted = await env.DB.prepare(`INSERT OR IGNORE INTO trip_requests
        (id,request_hash,retry_token_hash,email,answers_json,details_json,profile_json,algorithm_version,created_at,updated_at,email_key)
        SELECT ?,?,?,?,?,?,?,?,?,?,? WHERE (SELECT COUNT(*) FROM trip_requests WHERE email = ? AND created_at > ?) < 5`)
        .bind(data.requestId, hash, tokenHash, email, JSON.stringify(answers), JSON.stringify(details), JSON.stringify(profile), ALGORITHM_VERSION, now, now, `profile/${data.requestId}/v1`, email, now - 3600000).run()
      if (!inserted.meta.changes) {
        const duplicate = await readRequest(env, data.requestId)
        if (!duplicate) throw new ApiError(429, 'TOO_MANY_REQUESTS')
        if (duplicate.request_hash !== hash || duplicate.retry_token_hash !== tokenHash) throw new ApiError(409, 'REQUEST_CONFLICT')
        return json(receipt(duplicate, io.now()))
      }
      const result = await deliverProfile(request, env, data.requestId, io)
      return json(receipt(result, io.now()), 201)
    } catch (error) {
      if (error instanceof ApiError) return json({ code: error.code }, error.status)
      if (error instanceof InvalidAnswers) return json({ code: error.code }, 422)
      if (error instanceof Error && error.message === 'INVALID_DETAILS') return json({ code: 'INVALID_DETAILS' }, 422)
      // Do not disclose provider messages, profiles, personal data, or credentials.
      return json({ code: 'SERVICE_UNAVAILABLE' }, 503)
    }
  }
}
export default { fetch: createHandler() }
