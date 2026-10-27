import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import type { Database, DbStatement, Env, Io } from '../platform.ts'
import { createHandler } from '../index.ts'

export const currentAnswers = () => ({ motivation:['nature'], destinations:['nature'], company:['couple'], pace:['balanced'], accommodation:['practical'], activities:['nature'], transport:['train'], environment:['nature'], food:['other'], planning:['organized'] })
export const canonicalAnswers = () => ({ q1:['naturaleza'], q2:['naturaleza'], q3:['pareja'], q4:['equilibrado'], q5:['practicos'], q6:['naturaleza'], q7:['tren'], q8:['naturales'], q9:['otras_prioridades'], q10:['organizado'] })
export const details = () => ({ destination:'Japón', destinationUnknown:false, days:'14', daysUnknown:false, season:'Primavera de 2027', seasonUnknown:false, company:'couple', budget:'2500', budgetUnknown:false, needs:'' })
export class SqliteD1 implements Database {
  db = new DatabaseSync(':memory:')
  failAcceptedWrite = false
  constructor() { this.db.exec(readFileSync(new URL('../../migrations/0001_trip_requests.sql', import.meta.url), 'utf8')) }
  prepare(sql: string): DbStatement {
    let values: unknown[] = []
    const wrapper: DbStatement = {
      bind: (...parameters) => { values = parameters; return wrapper },
      first: async <T>() => (this.db.prepare(sql).get(...values as never[]) as T | undefined) || null,
      run: async () => {
        if (this.failAcceptedWrite && sql.includes('resend_id =') && values[0] === 'accepted') { this.failAcceptedWrite = false; throw new Error('Simulated D1 write failure after provider acceptance') }
        const result = this.db.prepare(sql).run(...values as never[])
        return { meta: { changes: Number(result.changes) } }
      },
    }
    return wrapper
  }
}
export function fixture() {
  const db = new SqliteD1()
  const env: Env = { DB: db, ENVIRONMENT:'production', EMAIL_MODE:'resend', RESEND_API_KEY:'test-key-never-used-on-network', EMAIL_FROM:'Aripajama <test@example.test>', REPLY_TO:'test@example.test', PUBLIC_SITE_URL:'https://aripajama.example', TURNSTILE_SITE_KEY:'test-site-key', TURNSTILE_SECRET_KEY:'test-secret', REQUEST_LIMITER: { limit: async () => ({ success: true }) } }
  env.EMAIL_TEST_RESTRICTED = 'true'
  env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  let now = 1800000000000
  const sent: { key: string; payload: Record<string, unknown> }[] = []
  const accepted = new Map<string, string>()
  const state = { providerStatus:200, captcha:true, hostname:'aripajama.example', action:'trip_request', networkError:false, sendDelay: null as Promise<void> | null }
  const io: Io = { now: () => now, fetch: async (input, init) => {
    const url = String(input)
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') return Response.json({ success:state.captcha, hostname:state.hostname, action:state.action })
    if (url !== 'https://api.resend.com/emails') throw new Error(`Unexpected network destination: ${url}`)
    const key = new Headers(init?.headers).get('Idempotency-Key')!
    const payload = JSON.parse(init!.body as string)
    sent.push({ key, payload })
    if (state.sendDelay) await state.sendDelay
    if (state.networkError) throw new Error('Simulated provider timeout')
    if (state.providerStatus !== 200) return Response.json({ message:'Provider detail must never leak' }, { status:state.providerStatus, headers:{ 'Retry-After':'5' } })
    if (!accepted.has(key)) accepted.set(key, `test-email-${accepted.size + 1}`)
    return Response.json({ id:accepted.get(key) })
  } }
  const handler = createHandler(io)
  const id = 'request_fixture_000000000001'
  const token = 'a'.repeat(64)
  const payload = () => ({ requestId:id, retryToken:token, answers:currentAnswers(), details:details(), email:'traveler@example.test', consent:true, turnstileToken:'test-token', website:'' })
  const call = (path: string, data?: unknown, headers: Record<string,string> = {}, method = data === undefined ? 'GET' : 'POST') => handler(new Request(`https://aripajama.example${path}`, { method, headers:{ Origin:'https://aripajama.example', ...(data === undefined ? {} : { 'Content-Type':'application/json' }), ...headers }, ...(data === undefined ? {} : { body:JSON.stringify(data) }) }), env)
  const create = (data: unknown = payload()) => call('/api/trip-requests', data)
  const retry = () => call(`/api/trip-requests/${id}/retry-email`, { turnstileToken:'fresh-token' }, { Authorization:`Bearer ${token}` })
  const status = () => call(`/api/trip-requests/${id}`, undefined, { Authorization:`Bearer ${token}` })
  return { db, env, io, state, sent, accepted, id, token, payload, handler, call, create, retry, status, advance:(ms: number) => { now += ms } }
}
