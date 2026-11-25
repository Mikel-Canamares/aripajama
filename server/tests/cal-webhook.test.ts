import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { fixture } from './helpers.ts'
import { processCalEmails } from '../cal-webhook.ts'

async function setup() {
  const f = fixture()
  Object.assign(f.env, { BOOKING_ENABLED: 'true', CAL_BOOKING_URL: 'https://cal.com/aripajama/primera-cita',
    BOOKING_NOTIFICATIONS_ENABLED: 'true', CAL_WEBHOOK_SECRET: 'local-fixture-secret', ARIANA_EMAIL: 'traveler@example.test' })
  const { booking } = await (await f.create()).json()
  const data = { triggerEvent: 'BOOKING_CREATED', payload: { type: 'primera-cita', uid: 'cal-123', status: 'ACCEPTED',
    startTime: '2030-12-01T10:00:00Z', endTime: '2030-12-01T10:30:00Z',
    organizer: { username: 'aripajama', email: 'traveler@example.test', timeZone: 'Europe/Madrid' },
    attendees: [{ name: 'Persona de prueba', email: 'invitada@example.test', timeZone: 'UTC' }],
    responses: { attendeePhoneNumber: { value: '+34 600 000 000' } },
    metadata: { aripajama_reference: booking.reference, videoCallUrl: 'https://app.cal.com/video/test-room' } } }
  const post = (body: unknown = data, secret = f.env.CAL_WEBHOOK_SECRET!) => f.call('/api/cal/webhook', body,
    { 'X-Cal-Signature-256': createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex') })
  return { ...f, data, booking, post }
}

test('configuración del recibo, solicitud anterior y privacidad', async () => {
  const f = await setup()
  assert.deepEqual(Object.keys(f.booking).sort(), ['path', 'reference'])
  assert.equal(f.booking.path, 'aripajama/primera-cita')
  assert.notEqual(f.booking.reference, f.token)
  f.db.db.prepare('UPDATE trip_requests SET email=? WHERE id=?').run('anterior@example.test', f.id)
  assert.equal((await (await f.status()).json()).booking.email, 'anterior@example.test')
  f.env.CAL_BOOKING_URL = ''
  assert.equal((await (await f.status()).json()).booking, undefined)
  f.env.BOOKING_ENABLED = 'false'
  assert.equal((await f.post()).status, 404)
})

test('solo procesa eventos firmados, aceptados, del organizador, tipo y solicitud correctos', async () => {
  const f = await setup()
  assert.equal((await f.post(f.data, 'another-test-secret')).status, 401)
  assert.equal((await f.call('/api/cal/webhook', f.data)).status, 401)
  for (const changes of [{ status: 'PENDING' }, { type: 'otro' }, { organizer: { email: 'otro@example.test' } },
    { metadata: { aripajama_reference: 'b'.repeat(64) } }, { metadata: {} }]) {
    assert.equal((await f.post({ ...f.data, payload: { ...f.data.payload, ...changes } })).status, 200)
  }
  assert.equal((await f.post({ ...f.data, triggerEvent: 'PING' })).status, 200)
  assert.equal(f.sent.length, 0)
  assert.equal(f.db.db.prepare('select count(*) n from cal_notification_emails').get()?.n, 0)
})

test('un aviso privado por reserva incluso con reentregas concurrentes', async () => {
  const f = await setup()
  const responses = await Promise.all([f.post(), f.post(), f.post()])
  assert.ok(responses.every(response => response.ok))
  assert.equal(f.sent.length, 1)
  assert.deepEqual(f.sent[0].payload.to, ['traveler@example.test'])
  const message = String(f.sent[0].payload.text)
  for (const value of ['Cal Video', '+34 600 000 000', '2030', 'invitada@example.test', 'Japón', '10.', 'https://app.cal.com/video/test-room']) assert.ok(message.includes(value), value)
  assert.doesNotMatch(message, /pago|40 €|Stripe/i)
  assert.equal(f.db.db.prepare('select count(*) n from trip_requests').get()?.n, 1)
  assert.equal(f.db.db.prepare('select count(*) n from session_bookings').get()?.n, 0)
  assert.equal(f.db.db.prepare('select payload_json from cal_notification_emails').get()?.payload_json, null)
})

test('recupera una aceptación incierta sin duplicar y respeta los destinatarios autorizados', async () => {
  const f = await setup()
  f.env.EMAIL_TEST_RECIPIENTS = 'otro@example.test'
  await f.post()
  assert.equal(f.sent.length, 0)
  f.env.EMAIL_TEST_RECIPIENTS = f.env.ARIANA_EMAIL
  f.advance(300001)
  f.db.failAcceptedWrite = true
  await processCalEmails(f.env, f.io)
  assert.equal(f.accepted.size, 1)
  f.advance(45001)
  await processCalEmails(f.env, f.io)
  assert.equal(f.sent.length, 2)
  assert.deepEqual(f.sent[0], f.sent[1])
  assert.equal(f.accepted.size, 1)
  assert.equal(f.db.db.prepare('select status from cal_notification_emails').get()?.status, 'accepted')
})

test('correo simulado local disponible para inspección sin contactar al proveedor', async () => {
  const f = await setup()
  Object.assign(f.env, { ENVIRONMENT: 'development', EMAIL_MODE: 'mock' })
  await f.post()
  assert.equal(f.db.db.prepare('select status from cal_notification_emails').get()?.status, 'simulated')
  assert.equal(f.sent.length, 0)
})
