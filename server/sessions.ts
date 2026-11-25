import { defaultIo, digest, type Env, type Io } from './platform.ts'
import { validEmail } from '../src/data/trip-request.ts'
import { phaseOneTestMode } from './test-mode.ts'

export type Appointment = {
  start: string; end: string; timeZone: string; attendeeTimeZone: string
  email: string; name: string | null; videoUrl: string | null
}
type BaseEvent = { eventKey: string; bookingUid: string; reference: string; occurredAt: number; test?: true }
// Trusted INTERNAL contract. The phase-2 adapter must authenticate and verify facts
// before calling this function. A 'confirmed' payment is verified, not just initiated.
export type SessionEvent = BaseEvent & (
  { kind: 'booking'; status: 'pending' | 'confirmed' | 'cancelled'; appointment?: Appointment } |
  { kind: 'payment'; status: 'pending' | 'confirmed' | 'failed'; payment: { id: string; bookingUid: string; amountCents: number; currency: string } }
)
export type BookingRow = {
  uid: string; request_id: string; booking_status: 'unknown' | 'pending' | 'confirmed' | 'cancelled'
  booking_at: number; appointment_json: string | null
  payment_status: 'unknown' | 'pending' | 'confirmed' | 'failed'; payment_at: number
  payment_id: string | null; amount_cents: number | null; currency: string | null
  review_required: number; revision: number; created_at: number; updated_at: number; is_test: number
}
type EventRow = { payload_hash: string; status: string; incident_code: string | null; booking_uid: string }
export const readBooking = (env: Env, uid: string) => env.DB.prepare('SELECT * FROM session_bookings WHERE uid = ?').bind(uid).first<BookingRow>()
export const eligibleBooking = (row: BookingRow) => row.booking_status === 'confirmed' && row.payment_status === 'confirmed' &&
  row.amount_cents === 4000 && row.currency === 'EUR' && !!row.payment_id && !!row.appointment_json && !row.review_required

export function safeVideoUrl(value: string | null): string | null {
  if (value === null) return null
  const url = new URL(value)
  if (value.length > 2000 || url.protocol !== 'https:' || url.username || url.password) throw new Error('INVALID_SESSION_EVENT')
  return url.href
}
function validZone(value: string) {
  if (typeof value !== 'string' || value.length > 100 || !value) throw new Error('INVALID_SESSION_EVENT')
  new Intl.DateTimeFormat('es-ES', { timeZone: value }).format(0)
  return value
}
function normalizeEvent(input: SessionEvent): SessionEvent {
  const token = (value: string) => typeof value === 'string' && /^[a-zA-Z0-9_:/.-]{1,200}$/.test(value)
  if (!input || !token(input.eventKey) || !token(input.bookingUid) || !/^[a-f0-9]{64}$/.test(input.reference) ||
    !Number.isSafeInteger(input.occurredAt) || input.occurredAt < 0) throw new Error('INVALID_SESSION_EVENT')
  if (input.test !== undefined && input.test !== true) throw new Error('INVALID_SESSION_EVENT')
  const base = { eventKey: input.eventKey, bookingUid: input.bookingUid, reference: input.reference, occurredAt: input.occurredAt, ...(input.test ? { test: true as const } : {}) }
  if (input.kind === 'payment') {
    const p = input.payment
    if (!['pending','confirmed','failed'].includes(input.status) || !p || !token(p.id) || !token(p.bookingUid) ||
      !Number.isSafeInteger(p.amountCents) || p.amountCents < 0 || !/^[A-Za-z]{3}$/.test(p.currency)) throw new Error('INVALID_SESSION_EVENT')
    return { ...base, kind: 'payment', status: input.status, payment: { id: p.id, bookingUid: p.bookingUid, amountCents: p.amountCents, currency: p.currency.toUpperCase() } }
  }
  if (input.kind !== 'booking' || !['pending','confirmed','cancelled'].includes(input.status) || (input.status === 'confirmed' && !input.appointment)) throw new Error('INVALID_SESSION_EVENT')
  const a = input.appointment
  if (!a) return { ...base, kind: 'booking', status: input.status }
  const start = Date.parse(a.start), end = Date.parse(a.end)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start || !/[zZ]|[+-]\d\d:\d\d$/.test(a.start) ||
    !/[zZ]|[+-]\d\d:\d\d$/.test(a.end) || !validEmail(a.email) ||
    (a.name !== null && (typeof a.name !== 'string' || a.name.length > 200))) throw new Error('INVALID_SESSION_EVENT')
  return { ...base, kind: 'booking', status: input.status, appointment: {
    start: new Date(start).toISOString(), end: new Date(end).toISOString(), timeZone: validZone(a.timeZone),
    attendeeTimeZone: validZone(a.attendeeTimeZone), email: a.email.trim().toLowerCase(), name: a.name, videoUrl: safeVideoUrl(a.videoUrl),
  } }
}

export async function ingestSessionEvent(env: Env, input: SessionEvent, io: Io = defaultIo): Promise<string> {
  const event = normalizeEvent(input)
  if (event.test && !phaseOneTestMode(env)) throw new Error('TEST_MODE_DISABLED')
  const hash = await digest(JSON.stringify(event))
  for (let attempt = 0; attempt < 6; attempt++) {
    const prior = await env.DB.prepare('SELECT * FROM session_events WHERE event_key = ?').bind(event.eventKey).first<EventRow>()
    if (prior && prior.payload_hash !== hash) {
      // Preserve the original digest; a reused event key is never permission to mutate facts.
      await env.DB.batch([
        env.DB.prepare("UPDATE session_events SET status = 'incident', incident_code = 'EVENT_KEY_CONFLICT' WHERE event_key = ?").bind(event.eventKey),
        env.DB.prepare('UPDATE session_bookings SET review_required = 1 WHERE uid IN (?, ?)').bind(prior.booking_uid, event.bookingUid),
      ])
      return 'incident'
    }
    if (prior && prior.status !== 'received') return prior.status
    const request = await env.DB.prepare('SELECT id FROM trip_requests WHERE booking_reference = ?').bind(event.reference).first<{ id: string }>()
    const old = await readBooking(env, event.bookingUid)
    const now = io.now()
    const next: BookingRow = old ? { ...old, revision: old.revision + 1, updated_at: now } : {
      uid: event.bookingUid, request_id: request?.id || '', booking_status: 'unknown', booking_at: -1, appointment_json: null,
      payment_status: 'unknown', payment_at: -1, payment_id: null, amount_cents: null, currency: null,
      review_required: 0, revision: 1, created_at: now, updated_at: now, is_test: event.test ? 1 : 0,
    }
    let incident: string | null = !request ? 'UNKNOWN_REFERENCE' : old && old.request_id !== request.id ? 'REFERENCE_CONFLICT' : null
    if (old && old.is_test !== (event.test ? 1 : 0)) incident = 'EVENT_SOURCE_CONFLICT'
    let ignored = false
    if (!incident && event.kind === 'payment') {
      const other = await env.DB.prepare('SELECT uid FROM session_bookings WHERE payment_id = ? AND uid != ?').bind(event.payment.id, event.bookingUid).first()
      if (event.payment.bookingUid !== event.bookingUid) incident = 'PAYMENT_BOOKING_MISMATCH'
      else if (other || (old?.payment_id && old.payment_id !== event.payment.id)) incident = 'PAYMENT_ID_CONFLICT'
      else if (event.occurredAt < next.payment_at) ignored = true
      else if (old?.payment_status === 'confirmed' && event.status === 'pending') ignored = true
      else if (old?.payment_id && (old.amount_cents !== event.payment.amountCents || old.currency !== event.payment.currency)) incident = 'PAYMENT_FACTS_CONFLICT'
      else if (old?.payment_status === 'confirmed' && event.status !== 'confirmed') incident = 'PAYMENT_STATUS_CONFLICT'
      else if (event.occurredAt === next.payment_at && next.payment_status !== event.status &&
        !(next.payment_status === 'pending' && event.status === 'confirmed')) incident = 'EVENT_ORDER_CONFLICT'
      else {
        next.payment_status = event.status; next.payment_at = event.occurredAt
        next.payment_id = event.payment.id; next.amount_cents = event.payment.amountCents; next.currency = event.payment.currency
        if (event.status === 'confirmed' && (next.amount_cents !== 4000 || next.currency !== 'EUR')) incident = 'PAYMENT_AMOUNT_MISMATCH'
      }
    } else if (!incident && event.kind === 'booking') {
      const appointment = event.appointment ? JSON.stringify(event.appointment) : next.appointment_json
      if (next.booking_status === 'cancelled' && event.status !== 'cancelled') ignored = true
      else if (event.status !== 'cancelled' && event.occurredAt < next.booking_at) ignored = true
      else if (next.booking_status === 'confirmed' && event.status === 'pending') ignored = true
      else if (event.status !== 'cancelled' && event.occurredAt === next.booking_at &&
        !(next.booking_status === 'pending' && event.status === 'confirmed') &&
        (next.booking_status !== event.status || next.appointment_json !== appointment)) incident = 'EVENT_ORDER_CONFLICT'
      else {
        next.booking_status = event.status; next.booking_at = Math.max(next.booking_at, event.occurredAt); next.appointment_json = appointment
      }
    }
    if (incident) next.review_required = 1
    // Claim the event only if the snapshot used above is still current. D1 batch is
    // transactional; concurrent events retry from a new snapshot instead of losing facts.
    const gate = "EXISTS (SELECT 1 FROM session_events WHERE event_key = ? AND payload_hash = ? AND status = 'applying')"
    const statements = [
      env.DB.prepare("INSERT OR IGNORE INTO session_events (event_key,payload_hash,booking_uid,status,created_at) VALUES (?,?,?,'received',?)").bind(event.eventKey, hash, event.bookingUid, now),
      env.DB.prepare(`UPDATE session_events SET status = 'applying' WHERE event_key = ? AND payload_hash = ? AND status = 'received'
        AND ${old ? 'EXISTS (SELECT 1 FROM session_bookings WHERE uid = ? AND revision = ? AND review_required = ?)' : 'NOT EXISTS (SELECT 1 FROM session_bookings WHERE uid = ?)'}
        AND NOT EXISTS (SELECT 1 FROM session_bookings WHERE payment_id = ? AND uid != ?)`)
        .bind(event.eventKey, hash, event.bookingUid, ...(old ? [old.revision, old.review_required] : []),
          event.kind === 'payment' && !incident ? event.payment.id : null, event.bookingUid),
    ]
    if (request && (!old || old.request_id === request.id)) {
      const fields = ['uid','request_id','booking_status','booking_at','appointment_json','payment_status','payment_at','payment_id','amount_cents','currency','review_required','revision','created_at','updated_at','is_test'] as const
      statements.push(env.DB.prepare(`INSERT INTO session_bookings (${fields.join(',')}) SELECT ${fields.map(() => '?').join(',')} WHERE ${gate}
        ON CONFLICT(uid) DO UPDATE SET ${fields.filter(f => !['uid','request_id','created_at'].includes(f)).map(f => `${f}=excluded.${f}`).join(',')}`)
        .bind(...fields.map(f => next[f]), event.eventKey, hash))
    } else if (old) {
      statements.push(env.DB.prepare(`UPDATE session_bookings SET review_required = 1 WHERE uid = ? AND ${gate}`).bind(old.uid, event.eventKey, hash))
    }
    if (incident === 'PAYMENT_ID_CONFLICT' && event.kind === 'payment') {
      statements.push(env.DB.prepare(`UPDATE session_bookings SET review_required = 1 WHERE payment_id = ? AND ${gate}`)
        .bind(event.payment.id, event.eventKey, hash))
    }
    statements.push(
      env.DB.prepare(`INSERT OR IGNORE INTO session_notifications (booking_uid,email_key,created_at,updated_at)
        SELECT uid, 'paid-session/' || uid || '/v1', ?, ? FROM session_bookings WHERE uid = ? AND booking_status = 'confirmed'
        AND payment_status = 'confirmed' AND amount_cents = 4000 AND currency = 'EUR' AND payment_id IS NOT NULL
        AND appointment_json IS NOT NULL AND review_required = 0 AND ${gate}`).bind(now, now, event.bookingUid, event.eventKey, hash),
      env.DB.prepare(`UPDATE session_events SET status = ?, incident_code = ? WHERE event_key = ? AND payload_hash = ? AND status = 'applying'`)
        .bind(incident ? 'incident' : ignored ? 'ignored' : 'processed', incident, event.eventKey, hash),
    )
    await env.DB.batch(statements)
    const result = await env.DB.prepare('SELECT status FROM session_events WHERE event_key = ?').bind(event.eventKey).first<{ status: string }>()
    if (result?.status !== 'received') return result!.status
  }
  throw new Error('SESSION_EVENT_BUSY')
}
