// Structural subset of D1/Workers APIs; no SDK is required at runtime.
export interface DbStatement {
  bind(...values: unknown[]): DbStatement
  first<T = Record<string, unknown>>(): Promise<T | null>
  run(): Promise<{ meta: { changes: number } }>
}
export interface Database { prepare(sql: string): DbStatement }
export interface Env {
  DB: Database
  ASSETS?: { fetch(request: Request): Promise<Response> }
  REQUEST_LIMITER?: { limit(options: { key: string }): Promise<{ success: boolean }> }
  ENVIRONMENT?: string
  EMAIL_MODE?: string
  RESEND_API_KEY?: string
  EMAIL_FROM?: string
  REPLY_TO?: string
  PUBLIC_SITE_URL?: string
  TURNSTILE_MODE?: string
  TURNSTILE_SITE_KEY?: string
  TURNSTILE_SECRET_KEY?: string
  WHATSAPP_URL?: string
}
export type Io = { fetch: typeof fetch; now: () => number }
export const defaultIo: Io = { fetch: (...args) => fetch(...args), now: () => Date.now() }
export const localHostname = (hostname: string) => ['localhost', '127.0.0.1', '[::1]'].includes(hostname)
export const localDevelopment = (request: Request, env: Env) => env.ENVIRONMENT === 'development' && localHostname(new URL(request.url).hostname)
export async function digest(value: string) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(byte => byte.toString(16).padStart(2, '0')).join('')
}
export class ApiError extends Error {
  readonly status: number
  readonly code: string
  constructor(status: number, code: string) { super(code); this.status = status; this.code = code }
}
