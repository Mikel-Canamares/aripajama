import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './helpers.ts'

test('guarda en SQL, calcula en servidor y expone únicamente el recibo de envío', async () => {
  const f = fixture()
  const response = await f.create()
  assert.equal(response.status,201)
  const result = await response.json()
  assert.equal(result.emailStatus,'accepted')
  assert.equal(result.saved,true)
  assert.ok(!JSON.stringify(result).includes('explorador'))
  const row = f.db.db.prepare('SELECT * FROM trip_requests').get()!
  assert.equal(JSON.parse(row.profile_json as string).principal,'explorador')
  assert.equal(row.algorithm_version,'1.0.0')
  assert.equal(row.resend_id,'test-email-1')
  assert.deepEqual(JSON.parse(row.details_json as string).budget,'2500')
  assert.ok(f.sent[0].payload.html)
  assert.ok(f.sent[0].payload.text)
})
test('doble confirmación conserva una fila y un único envío', async () => {
  const f = fixture()
  await Promise.all([f.create(),f.create(),f.create()])
  assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM trip_requests').get()!.n,1)
  assert.equal(f.sent.length,1)
  assert.equal((await (await f.create()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,1)
})
test('un identificador con otro contenido o token devuelve conflicto', async () => {
  const f = fixture(); await f.create()
  assert.equal((await f.create({ ...f.payload(),email:'other@example.test' })).status,409)
  assert.equal((await f.create({ ...f.payload(),retryToken:'b'.repeat(64) })).status,409)
  assert.equal(f.sent.length,1)
})
test('no configura un éxito ficticio sin credenciales; permite conectar y reintentar después', async () => {
  const f = fixture(); delete f.env.RESEND_API_KEY
  const result = await (await f.create()).json()
  assert.equal(result.saved,true); assert.equal(result.emailStatus,'unconfigured'); assert.equal(f.sent.length,0)
  f.env.RESEND_API_KEY = 'fake-key-in-injected-test'
  assert.equal((await (await f.retry()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,1)
})
for (const status of [400,401,403,409,429,500]) test(`error Resend ${status}: conserva solicitud y permite reintento seguro`, async () => {
  const f = fixture(); f.state.providerStatus = status
  const first = await (await f.create()).json()
  assert.equal(first.emailStatus,'failed'); assert.equal(first.saved,true)
  assert.ok(!JSON.stringify(first).includes('Provider detail'))
  f.advance(6000); f.state.providerStatus = 200
  const result = await (await f.retry()).json()
  assert.equal(result.emailStatus,'accepted')
  assert.equal(f.sent[0].key,f.sent[1].key)
  assert.deepEqual(f.sent[0].payload,f.sent[1].payload)
})
test('reintentos simultáneos se excluyen mediante una concesión SQL atómica', async () => {
  const f = fixture(); f.state.providerStatus = 500
  await f.create(); f.advance(6000); f.state.providerStatus = 200
  await Promise.all([f.retry(),f.retry(),f.retry()])
  assert.equal(f.sent.length,2)
  assert.equal(f.accepted.size,1)
})
test('un fallo SQL después de la aceptación se recupera con la misma clave del proveedor', async () => {
  const f = fixture(); f.db.failAcceptedWrite = true
  assert.equal((await f.create()).status,503)
  assert.equal((await (await f.status()).json()).emailStatus,'sending')
  f.advance(46000)
  assert.equal((await (await f.retry()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,2)
  assert.equal(f.accepted.size,1)
  assert.equal(f.sent[0].key,f.sent[1].key)
})
test('no reenvía un resultado incierto fuera de la ventana de idempotencia', async () => {
  const f = fixture(); f.state.networkError = true
  assert.equal((await (await f.create()).json()).emailStatus,'failed')
  f.advance(24*3600000); f.state.networkError = false
  const result = await (await f.retry()).json()
  assert.equal(result.emailStatus,'review_required'); assert.equal(result.canRetry,false)
  assert.equal(f.sent.length,1)
})
test('el contenido del correo queda fijado antes del primer intento', async () => {
  const f = fixture(); f.state.providerStatus = 500
  await f.create(); f.advance(6000); f.state.providerStatus = 200
  f.env.EMAIL_FROM = 'Otra <other@example.test>'; f.env.PUBLIC_SITE_URL = 'https://changed.example'
  f.state.hostname = 'changed.example'
  await f.call(`/api/trip-requests/${f.id}/retry-email`, { turnstileToken:'fresh-token' }, { Authorization:`Bearer ${f.token}`, Origin:'https://changed.example' })
  assert.deepEqual(f.sent[0].payload,f.sent[1].payload)
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
test('límite de frecuencia y límite global por email no producen envíos extra', async () => {
  const f = fixture()
  f.env.REQUEST_LIMITER = { limit:async () => ({ success:false }) }
  assert.equal((await f.create()).status,429)
  f.env.REQUEST_LIMITER = { limit:async () => ({ success:true }) }
  for (let index = 0; index < 5; index++) assert.equal((await f.create({ ...f.payload(),requestId:`request_for_rate_00000000${index}` })).status,201)
  assert.equal((await f.create({ ...f.payload(),requestId:'request_for_rate_000000009' })).status,429)
  assert.equal(f.sent.length,5)
})
test('mock local declara simulación y jamás llama al proveedor', async () => {
  const f = fixture(); f.env.ENVIRONMENT = 'development'; f.env.EMAIL_MODE = 'mock'; f.env.TURNSTILE_MODE = 'mock'
  const request = new Request('http://127.0.0.1:8787/api/trip-requests',{ method:'POST',headers:{ Origin:'http://127.0.0.1:4173','Content-Type':'application/json' },body:JSON.stringify({ ...f.payload(),turnstileToken:'local-test-token' }) })
  assert.equal((await (await f.handler(request,f.env)).json()).emailStatus,'simulated')
  assert.equal(f.sent.length,0)
})
test('localhost bloquea Resend real incluso con claves presentes', async () => {
  const f = fixture(); f.env.ENVIRONMENT = 'development'; f.env.TURNSTILE_MODE = 'mock'
  const request = new Request('http://127.0.0.1:8787/api/trip-requests',{ method:'POST',headers:{ Origin:'http://127.0.0.1:4173','Content-Type':'application/json' },body:JSON.stringify({ ...f.payload(),turnstileToken:'local-test-token' }) })
  assert.equal((await (await f.handler(request,f.env)).json()).emailStatus,'unconfigured')
  assert.equal(f.sent.length,0)
})
test('controla tamaño, método, configuración de verificación y emisor inválido', async () => {
  const f = fixture()
  assert.equal((await f.call('/api/trip-requests')).status,405)
  assert.equal((await f.create({ ...f.payload(),website:'x'.repeat(17000) })).status,413)
  delete f.env.TURNSTILE_SECRET_KEY
  assert.equal((await f.create()).status,503)
  f.env.TURNSTILE_SECRET_KEY = 'test-secret'
  f.env.EMAIL_FROM = 'not-an-email'
  assert.equal((await (await f.create()).json()).emailStatus,'unconfigured')
  assert.equal(f.sent.length,0)
})
