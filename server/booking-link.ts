import type { Env } from './platform.ts'
import { bookingHref, bookingPath, validEmail, type BookingOptions } from '../src/data/trip-request.ts'

export const newBookingReference = () => [...crypto.getRandomValues(new Uint8Array(32))]
  .map(byte => byte.toString(16).padStart(2, '0')).join('')

export function configuredBookingPath(env: Pick<Env, 'BOOKING_ENABLED' | 'CAL_BOOKING_URL'>): string | undefined {
  if (env.BOOKING_ENABLED !== 'true') return undefined
  try {
    const url = new URL(env.CAL_BOOKING_URL || '')
    const path = url.pathname.slice(1).replace(/\/$/, '')
    if (url.origin === 'https://cal.com' && !url.username && !url.password && !url.search && !url.hash && bookingPath.test(path)) return path
  } catch { return undefined }
}

export function bookingOptions(env: Pick<Env, 'BOOKING_ENABLED' | 'CAL_BOOKING_URL'>, reference: string | null, email?: string | null): BookingOptions | undefined {
  const path = configuredBookingPath(env)
  if (!path || !reference || !/^[a-f0-9]{64}$/.test(reference)) return undefined
  return { path, reference, ...(email && validEmail(email) ? { email } : {}) }
}

export function bookingLink(env: Pick<Env, 'BOOKING_ENABLED' | 'CAL_BOOKING_URL'>, reference?: string | null): string | undefined {
  const options = bookingOptions(env, reference ?? null)
  return options ? bookingHref(options) : undefined
}
