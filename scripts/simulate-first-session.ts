import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fixture } from '../server/tests/helpers.ts'
import { readRequest } from '../server/delivery.ts'
import { ingestSessionEvent, type SessionEvent } from '../server/sessions.ts'
import { processSessionNotifications } from '../server/session-delivery.ts'

// All outbound requests are intercepted by fixture().io. No global fetch is used.
const f = fixture()
f.env.ARIANA_EMAIL = 'ariana@example.test'
f.env.EMAIL_TEST_RECIPIENTS += ',ariana@example.test'
f.env.BOOKING_NOTIFICATIONS_ENABLED = 'true'
assert.equal((await f.create()).status, 201)
const request = (await readRequest(f.env, f.id))!
const base = { bookingUid: 'simulated-session-1', reference: request.booking_reference!, occurredAt: f.io.now() }
const booking: SessionEvent = { ...base, kind: 'booking', eventKey: 'simulated-booking-event', status: 'confirmed', appointment: {
  start: '2027-03-28T08:00:00Z', end: '2027-03-28T08:40:00Z', timeZone: 'Europe/Madrid', attendeeTimeZone: 'Europe/Madrid',
  name: 'Viajera de prueba', email: 'traveler@example.test', videoUrl: 'https://meet.google.com/ejemplo-simulado',
} }
const payment: SessionEvent = { ...base, kind: 'payment', eventKey: 'simulated-payment-event', status: 'confirmed',
  payment: { id: 'pi_simulated_only', bookingUid: base.bookingUid, amountCents: 4000, currency: 'EUR' } }
assert.equal(f.sent.length, 1) // Profile only; submitting the form does not notify Ariana.
await ingestSessionEvent(f.env, booking, f.io)
await processSessionNotifications(f.env, f.io)
assert.equal(f.sent.length, 1)
await ingestSessionEvent(f.env, payment, f.io)
await processSessionNotifications(f.env, f.io)
await ingestSessionEvent(f.env, payment, f.io)
await ingestSessionEvent(f.env, booking, f.io)
await processSessionNotifications(f.env, f.io)
await processSessionNotifications(f.env, f.io)
assert.equal(f.sent.length, 2)
assert.equal(f.accepted.size, 2)
assert.equal(f.db.db.prepare('SELECT status FROM session_notifications').get()?.status, 'accepted')
await mkdir('.email-preview', { recursive: true })
await writeFile('.email-preview/simulated-paid-session.html', String(f.sent[1].payload.html))
await writeFile('.email-preview/simulated-paid-session.txt', String(f.sent[1].payload.text))
console.log('Simulación local correcta: formulario → perfil → reserva y pago de 40 EUR → un único aviso. Cero envíos reales.')
