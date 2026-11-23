import { normalizeTripDetails } from '../src/data/trip-request.ts'
import { ALGORITHM_VERSION, calcularPerfil, InvalidAnswers, mapCurrentAnswers } from './profiles.ts'
import { readRequest, receipt } from './delivery.ts'
import { ApiError, defaultIo, digest, localDevelopment, type Env, type Io } from './platform.ts'
import { newBookingReference } from './booking-link.ts'
import { processSessionNotifications } from './session-delivery.ts'
import { sessionTestPage } from './session-test.ts'

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
      if (url.pathname === '/api/health' && request.method === 'GET') return json({ ok: true })
      const testSession = url.pathname.match(/^\/api\/session-test\/([a-f0-9]{64})$/)
      if (testSession) {
        if (request.method === 'POST') { checkOrigin(request, env); await limit(request, env) }
        return await sessionTestPage(request, env, testSession[1], io)
      }
      const match = url.pathname.match(/^\/api\/trip-requests\/([a-zA-Z0-9_-]{20,80})$/)
      if (match && request.method === 'GET') return json(receipt(await authorize(request, env, match[1])))
      if (url.pathname !== '/api/trip-requests') return json({ code: 'NOT_FOUND' }, 404)
      if (request.method !== 'POST') return json({ code: 'METHOD_NOT_ALLOWED' }, 405)
      checkOrigin(request, env)
      await limit(request, env)
      const data = await body(request)
      if (Object.keys(data).some(key => !['requestId','retryToken','answers','details','website'].includes(key))) throw new ApiError(422, 'INVALID_REQUEST')
      if (data.website) throw new ApiError(422, 'INVALID_REQUEST')
      if (typeof data.requestId !== 'string' || !ID.test(data.requestId) || typeof data.retryToken !== 'string' || !TOKEN.test(data.retryToken)) throw new ApiError(422, 'INVALID_REQUEST')
      const answers = mapCurrentAnswers(data.answers)
      const details = normalizeTripDetails(data.details)
      const hash = await digest(JSON.stringify({ answers, details }))
      const tokenHash = await digest(data.retryToken)
      const existing = await readRequest(env, data.requestId)
      if (existing) {
        if (existing.request_hash !== hash || existing.retry_token_hash !== tokenHash) throw new ApiError(409, 'REQUEST_CONFLICT')
        return json(receipt(existing))
      }
      const profile = calcularPerfil(answers)
      const now = io.now()
      const inserted = await env.DB.prepare(`INSERT INTO trip_requests
        (id,request_hash,retry_token_hash,answers_json,details_json,profile_json,algorithm_version,created_at,updated_at,email_key,booking_reference)
        VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING`)
        .bind(data.requestId, hash, tokenHash, JSON.stringify(answers), JSON.stringify(details), JSON.stringify(profile), ALGORITHM_VERSION, now, now, `profile/${data.requestId}/v1`, newBookingReference()).run()
      if (!inserted.meta.changes) {
        const duplicate = await readRequest(env, data.requestId)
        if (!duplicate) throw new ApiError(503, 'SERVICE_UNAVAILABLE')
        if (duplicate.request_hash !== hash || duplicate.retry_token_hash !== tokenHash) throw new ApiError(409, 'REQUEST_CONFLICT')
        return json(receipt(duplicate))
      }
      return json({ requestId: data.requestId, saved: true, profile: profile.principal }, 201)
    } catch (error) {
      if (error instanceof ApiError) return json({ code: error.code }, error.status)
      if (error instanceof InvalidAnswers) return json({ code: error.code }, 422)
      if (error instanceof Error && error.message === 'INVALID_DETAILS') return json({ code: 'INVALID_DETAILS' }, 422)
      // Do not disclose provider messages, profiles, personal data, or credentials.
      return json({ code: 'SERVICE_UNAVAILABLE' }, 503)
    }
  }
}
export default {
  fetch: createHandler(),
  scheduled: (_event: unknown, env: Env, context: { waitUntil(promise: Promise<unknown>): void }) => {
    context.waitUntil(processSessionNotifications(env))
  },
}
