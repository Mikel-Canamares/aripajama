import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './helpers.ts'
import { readRequest } from '../delivery.ts'
import { ingestSessionEvent } from '../sessions.ts'
import { processSessionNotifications } from '../session-delivery.ts'
import { TEST_OWNER, sessionTestLink } from '../test-mode.ts'

async function setup() {
  const f = fixture()
  Object.assign(f.env, { PHASE1_TEST_MODE: 'true', SESSION_TEST_SIGNING_KEY: 'b'.repeat(64), EMAIL_TEST_RESTRICTED: 'true',
    EMAIL_TEST_RECIPIENTS: TEST_OWNER, ARIANA_EMAIL: TEST_OWNER, BOOKING_NOTIFICATIONS_ENABLED: 'true' })
  // Simulate a historical request with an accepted profile email and an existing test link.
  const create = async () => {
    const response = await f.create()
    f.db.db.prepare("UPDATE trip_requests SET email = ?, email_status = 'accepted' WHERE id = ?").run(TEST_OWNER, f.id)
    return response
  }
  const link = async () => {
    const row = (await readRequest(f.env, f.id))!
    return new URL((await sessionTestLink(f.env, row.booking_reference, row.created_at))!)
  }
  const get = (url: URL) => f.handler(new Request(url), f.env)
  const confirm = (url: URL, origin = 'https://aripajama.example', content = 'confirm=simulate') => f.handler(new Request(url, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body: content,
  }), f.env)
  const notice = () => f.db.db.prepare('SELECT * FROM session_notifications').get()!
  return { ...f, create, link, get, confirm, notice }
}

test('el formulario usa Turnstile real aunque haya enlaces históricos de prueba', async () => {
  const f = await setup()
  const config = await (await f.call('/api/trip-config')).json()
  assert.deepEqual(config, { turnstileSiteKey: f.env.TURNSTILE_SITE_KEY, localVerification: false })
  const verify = f.io.fetch
  f.io.fetch = (url, init) => {
    assert.equal(JSON.parse(String(init?.body)).secret, f.env.TURNSTILE_SECRET_KEY)
    return verify(url, init)
  }
  const secret = f.env.TURNSTILE_SECRET_KEY
  f.env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA'
  assert.equal((await f.call('/api/trip-requests', f.payload())).status, 503)
  f.env.TURNSTILE_SECRET_KEY = secret
  f.state.captcha = false
  assert.equal((await f.call('/api/trip-requests', { ...f.payload(), turnstileToken: 'XXXX.DUMMY.TOKEN.XXXX' })).status, 403)
  assert.equal(f.sent.length, 0)
})

test('GET firmado no ejecuta reservas: confirmación POST genera un único aviso marcado y sin datos en la página', async () => {
  const f = await setup(); await f.create(); const url = await f.link()
  const before = await f.get(url), html = await before.text()
  assert.equal(before.status, 200); assert.match(html, /No existe ninguna cita ni cobro real/)
  assert.doesNotMatch(html, /traveler@|naturaleza|Japón|¿Qué te mueve/)
  assert.equal(f.sent.length, 0); assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM session_bookings').get()?.n, 0)
  const result = await f.confirm(url)
  assert.equal(result.status, 200); assert.match(await result.text(), /Resend ha aceptado/)
  assert.equal(f.sent.length, 1); assert.equal(f.notice().status, 'accepted')
  assert.match(String(f.sent[0].payload.subject), /\[PRUEBA\]/)
  assert.match(String(f.sent[0].payload.text), /No existe ninguna cita ni cobro real/)
  assert.match(String(f.sent[0].payload.text), /Pago simulado \(sin cobro\)/)
  assert.match(String(f.sent[0].payload.text), /Japón/)
  assert.match(String(f.sent[0].payload.text), /Cuestionario completo/)
  assert.deepEqual(f.sent[0].payload.to, [TEST_OWNER])
  assert.equal(f.db.db.prepare('SELECT is_test FROM session_bookings').get()?.is_test, 1)
  await Promise.all([f.confirm(url), f.confirm(url), f.get(url)])
  assert.equal(f.sent.length, 1); assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM session_events').get()?.n, 2)
})

test('firmas alteradas, vencidas, desactivadas o de otro origen no pueden activar avisos', async () => {
  const f = await setup(); await f.create(); const url = await f.link()
  const tampered = new URL(url); tampered.searchParams.set('signature', '0'.repeat(64))
  assert.equal((await f.get(tampered)).status, 404)
  assert.equal((await f.confirm(url, 'https://attacker.example')).status, 403)
  assert.equal((await f.confirm(url, url.origin, 'confirm=simulate&amount=1')).status, 400)
  f.env.PHASE1_TEST_MODE = 'false'; assert.equal((await f.get(url)).status, 404)
  f.env.PHASE1_TEST_MODE = 'true'; f.advance(7 * 86400000 + 1)
  assert.equal((await f.get(url)).status, 404); assert.equal(f.sent.length, 0)
})

test('fallo real de envío conserva cola y el tick recupera sin volver a confirmar', async () => {
  const f = await setup(); await f.create(); const url = await f.link()
  f.state.networkError = true; await f.confirm(url)
  assert.equal(f.notice().status, 'failed'); const first = f.sent[0]
  f.advance(60000); f.state.networkError = false; await processSessionNotifications(f.env, f.io)
  assert.equal(f.notice().status, 'accepted'); assert.deepEqual(f.sent[1], first)
})

test('hechos simulados y hechos del proveedor no se mezclan', async () => {
  const f = await setup(); await f.create(); const url = await f.link(); await f.confirm(url)
  const row = f.db.db.prepare('SELECT * FROM session_bookings').get()!
  const request = (await readRequest(f.env, f.id))!
  const result = await ingestSessionEvent(f.env, { kind: 'payment', eventKey: 'real-provider-event', bookingUid: String(row.uid),
    reference: request.booking_reference!, occurredAt: f.io.now(), status: 'confirmed',
    payment: { id: String(row.payment_id), bookingUid: String(row.uid), amountCents: 4000, currency: 'EUR' } }, f.io)
  assert.equal(result, 'incident')
  assert.equal(f.db.db.prepare("SELECT incident_code FROM session_events WHERE event_key = 'real-provider-event'").get()?.incident_code, 'EVENT_SOURCE_CONFLICT')
})
