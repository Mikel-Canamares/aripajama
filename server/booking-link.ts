import type { Env } from './platform.ts'

export const newBookingReference = () => [...crypto.getRandomValues(new Uint8Array(32))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('')

export function bookingLink(env: Pick<Env, 'BOOKING_ENABLED' | 'CAL_BOOKING_URL'>, reference?: string | null): string | undefined {
  if (env.BOOKING_ENABLED !== 'true' || !reference || !/^[a-f0-9]{64}$/.test(reference)) return undefined
  try {
    const url = new URL(env.CAL_BOOKING_URL || '')
    if (url.protocol !== 'https:' || url.hostname !== 'cal.com' || url.port || url.username || url.password || url.search || url.hash ||
      !/^\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/?$/.test(url.pathname)) return undefined
    url.searchParams.set('metadata[aripajama_reference]', reference)
    return url.href
  } catch { return undefined }
}
