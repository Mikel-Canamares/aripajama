import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fixture } from './helpers.ts'

const stored = (f: ReturnType<typeof fixture>) => f.db.db.prepare('SELECT * FROM trip_requests WHERE id = ?').get(f.id)!
const assertBlocked = (result: Record<string, unknown>, id: string) => assert.deepEqual(result, {
  requestId:id, saved:true, emailStatus:'unconfigured', canRetry:true, errorCode:'EMAIL_RECIPIENT_NOT_ALLOWED',
})

for (const flag of [undefined, '', 'true', 'FALSE', 'False', ' false', 'false ', '0', 'unknown']) {
  test(`restricción activa por defecto con EMAIL_TEST_RESTRICTED=${JSON.stringify(flag)}`, async () => {
    const f = fixture()
    if (flag === undefined) delete f.env.EMAIL_TEST_RESTRICTED
    else f.env.EMAIL_TEST_RESTRICTED = flag
    f.env.EMAIL_TEST_RECIPIENTS = 'mikel.canamares@gmail.com'
    const response = await f.create()
    assert.equal(response.status,201)
    assertBlocked(await response.json(),f.id)
    assertBlocked(await (await f.retry()).json(),f.id)
    assertBlocked(await (await f.status()).json(),f.id)
    assert.equal(f.sent.length,0)
    const row = stored(f)
    assert.equal(row.email_attempts,0)
    assert.equal(row.first_attempt_at,null)
    assert.equal(row.email_payload_json,null)
    assert.equal(row.lease_token,null)
    assert.equal(row.lease_until,null)
    assert.equal(row.next_retry_at,null)
    assert.equal(row.resend_id,null)
    assert.equal(row.email_key,`profile/${f.id}/v1`)
    assert.equal(JSON.parse(row.profile_json as string).principal,'explorador')
  })
}

for (const recipients of [undefined, '', '  , , ', 'invalid, Name <traveler@example.test>']) {
  test(`lista vacía o sin direcciones válidas bloquea creación y reintento: ${JSON.stringify(recipients)}`, async () => {
    const f = fixture()
    if (recipients === undefined) delete f.env.EMAIL_TEST_RECIPIENTS
    else f.env.EMAIL_TEST_RECIPIENTS = recipients
    assertBlocked(await (await f.create()).json(),f.id)
    assertBlocked(await (await f.retry()).json(),f.id)
    assert.equal(f.sent.length,0)
  })
}

test('solo false exacto desactiva la restricción, incluso sin lista', async () => {
  const f = fixture()
  f.env.EMAIL_TEST_RESTRICTED = 'false'
  delete f.env.EMAIL_TEST_RECIPIENTS
  assert.equal((await (await f.create()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,1)
})

test('acepta lista múltiple, espacios, mayúsculas y entradas inválidas sin cambiar el destino', async () => {
  const f = fixture()
  delete f.env.EMAIL_TEST_RESTRICTED
  f.env.EMAIL_TEST_RECIPIENTS = 'other@example.test, , MIKEL.CANAMARES@GMAIL.COM , invalid'
  const response = await f.create({ ...f.payload(),email:'  Mikel.Canamares@Gmail.com  ' })
  assert.equal((await response.json()).emailStatus,'accepted')
  assert.deepEqual(f.sent[0].payload.to,['mikel.canamares@gmail.com'])
  const config = await (await f.call('/api/trip-config')).json()
  assert.deepEqual(Object.keys(config).sort(),['localVerification','turnstileSiteKey'])
})

for (const email of ['mikelcanamares@gmail.com', 'mikel.canamares+test@gmail.com', 'other@gmail.com']) {
  test(`la autorización exige dirección completa y no equipara alias: ${email}`, async () => {
    const f = fixture()
    f.env.EMAIL_TEST_RECIPIENTS = 'mikel.canamares@gmail.com'
    assertBlocked(await (await f.create({ ...f.payload(),email })).json(),f.id)
    assert.equal(f.sent.length,0)
  })
}

test('un bloqueo inicial no consume la ventana; autorización posterior conserva solicitud e idempotencia', async () => {
  const f = fixture()
  f.env.EMAIL_TEST_RECIPIENTS = ''
  await Promise.all([f.create(),f.create(),f.create()])
  const before = stored(f)
  assert.equal(f.db.db.prepare('SELECT COUNT(*) AS n FROM trip_requests').get()!.n,1)
  assert.equal(f.sent.length,0)
  f.advance(24*3600000)
  f.env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  await Promise.all([f.retry(),f.retry(),f.retry()])
  assert.equal((await (await f.status()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,1)
  assert.equal(f.sent[0].key,before.email_key)
  const after = stored(f)
  for (const field of ['id','email','profile_json','answers_json','details_json','created_at','email_key']) assert.equal(after[field],before[field])
  assert.equal(after.email_attempts,1)
})

test('un reintento bloqueado preserva contenido, clave, intentos y ventana de un fallo previo', async () => {
  const f = fixture()
  f.state.providerStatus = 500
  await f.create()
  const before = stored(f)
  f.env.EMAIL_TEST_RECIPIENTS = ''
  // The provider backoff remains in force before the restriction is evaluated.
  assert.equal((await (await f.retry()).json()).emailStatus,'failed')
  f.advance(6000)
  assertBlocked(await (await f.retry()).json(),f.id)
  assert.equal(f.sent.length,1)
  const blocked = stored(f)
  for (const field of ['email_key','email_payload_json','first_attempt_at','email_attempts','next_retry_at']) assert.equal(blocked[field],before[field])
  f.env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  f.state.providerStatus = 200
  await Promise.all([f.retry(),f.retry(),f.retry()])
  assert.equal((await (await f.status()).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,2)
  assert.deepEqual(f.sent[1],f.sent[0])
  assert.equal(f.accepted.size,1)
})

test('la restricción comprueba el destinatario persistido, no solo el email de la solicitud', async () => {
  const f = fixture()
  f.state.providerStatus = 500
  await f.create()
  const before = stored(f)
  f.advance(6000)
  f.db.db.prepare('UPDATE trip_requests SET email = ? WHERE id = ?').run('mikel.canamares@gmail.com',f.id)
  f.env.EMAIL_TEST_RECIPIENTS = 'mikel.canamares@gmail.com'
  assertBlocked(await (await f.retry()).json(),f.id)
  assert.equal(f.sent.length,1)
  assert.equal(stored(f).email_payload_json,before.email_payload_json)
})

test('todos los destinatarios del contenido persistido deben estar autorizados', async () => {
  const f = fixture()
  f.state.providerStatus = 500
  await f.create()
  f.advance(6000)
  const payload = JSON.parse(stored(f).email_payload_json as string)
  payload.to.push('unauthorized@example.test')
  f.db.db.prepare('UPDATE trip_requests SET email_payload_json = ? WHERE id = ?').run(JSON.stringify(payload),f.id)
  assertBlocked(await (await f.retry()).json(),f.id)
  assert.equal(f.sent.length,1)
})

test('aceptación seguida de fallo SQL se recupera tras bloqueo con la misma operación del proveedor', async () => {
  const f = fixture()
  f.db.failAcceptedWrite = true
  assert.equal((await f.create()).status,503)
  f.advance(46000)
  f.env.EMAIL_TEST_RECIPIENTS = ''
  assertBlocked(await (await f.retry()).json(),f.id)
  assert.equal(f.sent.length,1)
  f.env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  assert.equal((await (await f.retry()).json()).emailStatus,'accepted')
  assert.deepEqual(f.sent[1],f.sent[0])
  assert.equal(f.accepted.size,1)
})

test('cambiar la lista no degrada una aceptación ni permite superar la ventana segura', async () => {
  const accepted = fixture()
  await accepted.create()
  const before = stored(accepted)
  accepted.env.EMAIL_TEST_RECIPIENTS = ''
  assert.equal((await (await accepted.create()).json()).emailStatus,'accepted')
  assert.equal((await (await accepted.retry()).json()).emailStatus,'accepted')
  assert.deepEqual(stored(accepted),before)
  assert.equal(accepted.sent.length,1)

  const uncertain = fixture()
  uncertain.state.networkError = true
  await uncertain.create()
  uncertain.advance(6000)
  uncertain.env.EMAIL_TEST_RECIPIENTS = ''
  assertBlocked(await (await uncertain.retry()).json(),uncertain.id)
  uncertain.advance(24*3600000)
  const result = await (await uncertain.retry()).json()
  assert.equal(result.emailStatus,'review_required')
  assert.equal(result.canRetry,false)
  uncertain.env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  assert.equal((await (await uncertain.retry()).json()).emailStatus,'review_required')
  assert.equal(uncertain.sent.length,1)
})

test('la restricción no modifica una concesión activa', async () => {
  const f = fixture()
  let release!: () => void
  let notifyStarted!: () => void
  const started = new Promise<void>(resolve => { notifyStarted = resolve })
  const fetch = f.io.fetch
  f.io.fetch = (input, init) => {
    const response = fetch(input,init)
    if (String(input) === 'https://api.resend.com/emails') notifyStarted()
    return response
  }
  f.state.sendDelay = new Promise<void>(resolve => { release = resolve })
  const creation = f.create()
  try {
    await started
    assert.equal(f.sent.length,1)
    const before = stored(f)
    assert.equal(before.email_status,'sending')
    f.env.EMAIL_TEST_RECIPIENTS = ''
    assert.equal((await (await f.retry()).json()).emailStatus,'sending')
    assert.deepEqual(stored(f),before)
  } finally { release() }
  assert.equal((await (await creation).json()).emailStatus,'accepted')
  assert.equal(f.sent.length,1)
})

test('disabled conserva el envío desactivado aunque el destinatario esté autorizado', async () => {
  const f = fixture()
  f.env.EMAIL_MODE = 'disabled'
  const result = await (await f.create()).json()
  assert.equal(result.emailStatus,'unconfigured')
  assert.equal(result.errorCode,'EMAIL_NOT_CONFIGURED')
  await f.retry()
  assert.equal(f.sent.length,0)
  assert.equal(stored(f).email_attempts,0)
})
