import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './helpers.ts'

test('confirmaciones simultáneas guardan una solicitud sin email, reserva ni avisos', async () => {
  const f = fixture()
  const responses = await Promise.all([f.create(), f.create(), f.create()])
  assert.deepEqual(responses.map(r => r.status).sort(), [200, 200, 201])
  const result = { saved: true, requestId: f.id, profile: 'explorador' }
  for (const response of [...responses, await f.status()]) assert.deepEqual(await response.json(), result)
  const rows = f.db.db.prepare('SELECT * FROM trip_requests').all()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].email, null)
  assert.equal(rows[0].email_status, 'not_requested')
  assert.equal(JSON.parse(String(rows[0].profile_json)).principal, result.profile)
  assert.equal(rows[0].email_attempts, 0)
  assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM session_bookings').get()?.n, 0)
  assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM session_notifications').get()?.n, 0)
  assert.equal(f.sent.length, 0)
})
test('un identificador con otro contenido o token devuelve conflicto', async () => {
  const f = fixture()
  await f.create()
  assert.equal((await f.create({ ...f.payload(), details: { ...f.payload().details, days: '10' } })).status, 409)
  assert.equal((await f.create({ ...f.payload(), retryToken: 'b'.repeat(64) })).status, 409)
})
test('consulta y reintento exigen el token privado; no se publican perfiles ni previews', async () => {
  const f = fixture(); await f.create()
  assert.equal((await f.call(`/api/trip-requests/${f.id}`)).status,404)
  assert.equal((await f.call(`/api/trip-requests/${f.id}/retry-email`,{ turnstileToken:'x' })).status,404)
  assert.equal((await f.call('/api/email-preview')).status,404)
  const config = await (await f.call('/api/trip-config')).json()
  assert.deepEqual(Object.keys(config).sort(),['localVerification','turnstileSiteKey'])
})
test('Turnstile exige éxito, hostname y acción; fallo no guarda ni envía', async () => {
  for (const patch of [{ captcha:false },{ hostname:'attacker.example' },{ action:'another_form' }]) {
    const f = fixture(); Object.assign(f.state,patch)
    assert.equal((await f.create()).status,403)
    assert.equal(f.sent.length,0)
    assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM trip_requests').get()!.n,0)
  }
})
test('rechaza origen, consentimiento, campos, respuestas y email no válidos', async () => {
  const f = fixture()
  assert.equal((await f.call('/api/trip-requests',f.payload(),{ Origin:'https://attacker.example' })).status,403)
  for (const invalid of [{ ...f.payload(),consent:false },{ ...f.payload(),email:'x\r\nbcc:evil@example.test' },{ ...f.payload(),details:{ ...f.payload().details,days:'-2' } },{ ...f.payload(),answers:{ ...f.payload().answers,food:['other','local'] } },{ ...f.payload(),profile:'aventurero' }]) assert.equal((await f.create(invalid)).status,422)
  assert.equal(f.sent.length,0)
})
test('límite de frecuencia por origen de red', async () => {
  const f = fixture()
  f.env.REQUEST_LIMITER = { limit:async () => ({ success:false }) }
  assert.equal((await f.create()).status,429)
  assert.equal(f.sent.length, 0)
})
test('controla tamaño, método y configuración de verificación', async () => {
  const f = fixture()
  assert.equal((await f.call('/api/trip-requests')).status,405)
  assert.equal((await f.create({ ...f.payload(),website:'x'.repeat(17000) })).status,413)
  delete f.env.TURNSTILE_SECRET_KEY
  assert.equal((await f.create()).status,503)
  assert.equal(f.sent.length,0)
})
