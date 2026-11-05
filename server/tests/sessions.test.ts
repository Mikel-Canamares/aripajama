import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fixture, SqliteD1, canonicalAnswers } from './helpers.ts'
import { ingestSessionEvent, readBooking, type SessionEvent } from '../sessions.ts'
import { deliverSessionNotification, processSessionNotifications } from '../session-delivery.ts'
import { readRequest } from '../delivery.ts'
import { readableAnswers, renderSessionEmail } from '../session-email.ts'
import { bookingLink } from '../booking-link.ts'
import { renderProfileEmail } from '../email-template.ts'
import { PROFILE_IDS, PROFILE_QUESTIONS, ANSWER_MAP } from '../profiles.ts'
import { TRIP_QUESTIONS } from '../../src/data/questionnaire-content.ts'

async function setup() {
  const f = fixture()
  f.env.ARIANA_EMAIL = 'ariana@example.test'
  f.env.BOOKING_NOTIFICATIONS_ENABLED = 'true'
  f.env.EMAIL_TEST_RECIPIENTS += ',ariana@example.test'
  assert.equal((await f.create()).status, 201)
  const request = (await readRequest(f.env, f.id))!
  const base = { eventKey: 'booking-created', bookingUid: 'cal-booking-1', reference: request.booking_reference!, occurredAt: f.io.now() }
  const booking = (patch: Partial<Extract<SessionEvent, { kind: 'booking' }>> = {}): SessionEvent => ({
    ...base, kind: 'booking', status: 'confirmed', appointment: { start: '2027-03-28T08:00:00Z', end: '2027-03-28T08:40:00Z',
      timeZone: 'Europe/Madrid', attendeeTimeZone: 'America/New_York', name: null, email: 'booking@example.test', videoUrl: 'https://meet.google.com/example' }, ...patch,
  })
  const payment = (patch: Partial<Extract<SessionEvent, { kind: 'payment' }>> = {}): SessionEvent => ({
    ...base, eventKey: 'payment-confirmed', kind: 'payment', status: 'confirmed',
    payment: { id: 'pi_test_1', bookingUid: base.bookingUid, amountCents: 4000, currency: 'EUR' }, ...patch,
  })
  const ingest = (event: SessionEvent) => ingestSessionEvent(f.env, event, f.io)
  const count = (table: string) => Number((f.db.db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number }).count)
  const notice = () => f.db.db.prepare('SELECT * FROM session_notifications WHERE booking_uid = ?').get(base.bookingUid) as Record<string, unknown> | undefined
  const ready = async () => { await ingest(booking()); await ingest(payment()) }
  const tick = () => processSessionNotifications(f.env, f.io)
  return { ...f, request, base, booking, payment, ingest, count, notice, ready, tick }
}

test('flujo completo: formulario y perfil no avisan; cita pagada produce un único aviso con todas las respuestas', async () => {
  const f = await setup()
  assert.equal(f.count('session_notifications'), 0); assert.equal(f.sent.length, 1)
  await f.ready()
  assert.equal(f.sent.length, 1); assert.equal(f.count('session_notifications'), 1)
  await f.tick(); await f.tick(); await f.ingest(f.payment()); await f.tick()
  assert.equal(f.sent.length, 2); assert.equal(f.accepted.size, 2)
  assert.equal(f.notice()?.status, 'accepted')
  const payload = f.sent[1].payload
  assert.deepEqual(payload.to, ['ariana@example.test'])
  for (const text of ['40 €', 'Europe/Madrid', '10:00', 'booking@example.test', 'traveler@example.test', 'Japón', 'No facilitado', 'https://meet.google.com/example', f.id]) assert.ok(String(payload.text).includes(text), text)
  for (const question of TRIP_QUESTIONS) assert.ok(String(payload.text).includes(question.title))
  assert.doesNotMatch(JSON.stringify(payload), /puntuaciones|aportaciones|retry_token|resultadoOrientativo/)
  assert.equal((await readRequest(f.env, f.id))?.email_status, 'accepted')
})

for (const order of ['booking-first','payment-first'] as const) test(`reserva/pago en cualquier orden y duplicados: ${order}`, async () => {
  const f = await setup()
  const [first, second] = order === 'booking-first' ? [f.booking(), f.payment()] : [f.payment(), f.booking()]
  await f.ingest(first); await f.tick(); assert.equal(f.sent.length, 1)
  await Promise.all([f.ingest(second), f.ingest(second), f.ingest(first)])
  await Promise.all([f.tick(), f.tick()])
  assert.equal(f.count('session_bookings'), 1); assert.equal(f.count('session_events'), 2)
  assert.equal(f.count('session_notifications'), 1); assert.equal(f.sent.length, 2)
})

test('eventos distintos concurrentes fusionan reserva y pago sin perder hechos', async () => {
  const f = await setup()
  await Promise.all([f.ingest(f.booking()), f.ingest(f.payment())])
  await f.tick(); assert.equal(f.notice()?.status, 'accepted'); assert.equal(f.sent.length, 2)
})

test('pago pendiente o reserva pendiente esperan sin avisar', async () => {
  for (const kind of ['booking','payment']) {
    const f = await setup()
    await f.ingest(f.booking(kind === 'booking' ? { status: 'pending' } : {}))
    await f.ingest(f.payment(kind === 'payment' ? { status: 'pending' } : {}))
    await f.tick(); assert.equal(f.sent.length, 1); assert.equal(f.count('session_notifications'), 0)
  }
})

test('pendiente → confirmado con la misma marca temporal avanza sin falsa contradicción', async () => {
  const f = await setup()
  await f.ingest(f.booking({ eventKey: 'requested', status: 'pending' }))
  await f.ingest(f.payment({ eventKey: 'initiated', status: 'pending' }))
  await f.ready(); await f.tick()
  assert.equal(f.notice()?.status, 'accepted'); assert.equal(f.sent.length, 2)
})

test('una cancelación con la misma marca temporal es terminal', async () => {
  const f = await setup(); await f.ready()
  await f.ingest(f.booking({ eventKey: 'cancelled-at-same-time', status: 'cancelled' }))
  await f.tick(); assert.equal(f.notice()?.status, 'suppressed'); assert.equal(f.sent.length, 1)
})

test('cambio de pago confirmado bloquea la reserva y no emite un aviso obsoleto', async () => {
  const f = await setup(); await f.ready()
  assert.equal(await f.ingest(f.payment({ eventKey: 'different-payment', payment: { id: 'pi_other', bookingUid: f.base.bookingUid, amountCents: 4000, currency: 'EUR' } })), 'incident')
  await f.tick(); assert.equal(f.notice()?.status, 'review_required'); assert.equal(f.sent.length, 1)
})

test('cancelación después de obtener lease y antes de contactar con Resend suprime el envío', async () => {
  const f = await setup(); await f.ready()
  const prepare = f.db.prepare.bind(f.db)
  let reads = 0
  f.db.prepare = sql => {
    const statement = prepare(sql)
    if (sql === 'SELECT * FROM session_bookings WHERE uid = ?') {
      const first = statement.first.bind(statement)
      statement.first = async <T>() => {
        if (++reads === 2) f.db.db.prepare("UPDATE session_bookings SET booking_status = 'cancelled', revision = revision + 1").run()
        return first<T>()
      }
    }
    return statement
  }
  await f.tick(); assert.equal(f.notice()?.status, 'suppressed'); assert.equal(f.sent.length, 1)
})

for (const [amount, currency] of [[3999, 'EUR'], [4001, 'EUR'], [4000, 'USD']] as const) test(`importe/moneda incorrectos ${amount} ${currency} quedan bloqueados`, async () => {
  const f = await setup(); await f.ingest(f.booking())
  assert.equal(await f.ingest(f.payment({ payment: { id: 'pi_test_1', bookingUid: f.base.bookingUid, amountCents: amount, currency } })), 'incident')
  await f.tick(); assert.equal(f.sent.length, 1); assert.equal(f.count('session_notifications'), 0)
})

test('referencia desconocida o pago de otra cita registran incidencia sin datos personales', async () => {
  const f = await setup()
  assert.equal(await f.ingest(f.booking({ reference: 'f'.repeat(64) })), 'incident')
  assert.equal(f.count('session_bookings'), 0)
  assert.equal(await f.ingest(f.payment({ payment: { id: 'pi_test_1', bookingUid: 'another-booking', amountCents: 4000, currency: 'EUR' } })), 'incident')
  const events = JSON.stringify(f.db.db.prepare('SELECT * FROM session_events').all())
  assert.doesNotMatch(events, /traveler@|booking@|Japón|naturaleza|meet\.google/)
  await f.tick(); assert.equal(f.sent.length, 1)
})

test('no vincula por email y detecta cambio de referencia o de identificador de pago', async () => {
  const f = await setup(); await f.ready()
  const secondId = 'second_request_00000000000001'
  assert.equal((await f.create({ ...f.payload(), requestId: secondId })).status, 201)
  const second = (await readRequest(f.env, secondId))!
  assert.notEqual(second.booking_reference, f.request.booking_reference)
  assert.equal(await f.ingest(f.booking({ eventKey: 'other-ref', reference: second.booking_reference! })), 'incident')
  await f.tick(); assert.equal(f.notice()?.status, 'review_required')
  assert.equal((await readBooking(f.env, f.base.bookingUid))?.request_id, f.id)
})

test('un pago no puede reutilizarse para dos reservas, incluso concurrentes', async () => {
  const f = await setup()
  await f.ingest(f.booking()); await f.ingest(f.booking({ eventKey: 'second-booking', bookingUid: 'cal-booking-2' }))
  await Promise.all([f.ingest(f.payment()), f.ingest(f.payment({ eventKey: 'second-payment', bookingUid: 'cal-booking-2', payment: { id: 'pi_test_1', bookingUid: 'cal-booking-2', amountCents: 4000, currency: 'EUR' } }))])
  assert.equal(f.count('session_notifications'), 1)
  assert.equal(f.db.db.prepare("SELECT COUNT(*) AS n FROM session_events WHERE incident_code = 'PAYMENT_ID_CONFLICT'").get()?.n, 1)
  await f.tick(); assert.equal(f.sent.length, 1); assert.equal(f.notice()?.status, 'review_required')
})

test('clave de evento reutilizada con datos distintos bloquea el aviso pendiente', async () => {
  const f = await setup(); await f.ready()
  assert.equal(await f.ingest(f.payment({ payment: { id: 'pi_test_1', bookingUid: f.base.bookingUid, amountCents: 1, currency: 'EUR' } })), 'incident')
  await f.tick(); assert.equal(f.notice()?.status, 'review_required'); assert.equal(f.sent.length, 1)
})

test('eventos antiguos no degradan confirmaciones; cancelación conocida impide avisar', async () => {
  const f = await setup(); await f.ready()
  await f.ingest(f.payment({ eventKey: 'old-payment', status: 'pending', occurredAt: f.io.now() - 1 }))
  await f.ingest(f.booking({ eventKey: 'old-booking', status: 'pending', occurredAt: f.io.now() - 1 }))
  assert.equal((await readBooking(f.env, f.base.bookingUid))?.payment_status, 'confirmed')
  await f.ingest(f.booking({ eventKey: 'cancelled', status: 'cancelled', occurredAt: f.io.now() + 1 }))
  await f.ingest(f.booking({ eventKey: 'late-created', occurredAt: f.io.now() + 2 }))
  await f.tick(); assert.equal(f.notice()?.status, 'suppressed'); assert.equal(f.sent.length, 1)
})

test('el batch revierte evento, reserva y cola ante fallo y permite recuperar', async () => {
  const f = await setup(); await f.ingest(f.booking())
  f.db.failBatchAt = 3
  await assert.rejects(f.ingest(f.payment()))
  assert.equal(f.count('session_events'), 1); assert.equal(f.count('session_notifications'), 0)
  assert.equal((await readBooking(f.env, f.base.bookingUid))?.payment_status, 'unknown')
  await f.ingest(f.payment()); await f.tick(); assert.equal(f.notice()?.status, 'accepted')
})

test('fallo temporal se recupera por tick sin nuevos eventos y conserva contenido/destino/clave', async () => {
  const f = await setup(); await f.ready(); f.state.networkError = true
  await f.tick(); const first = { ...f.sent[1] }; assert.equal(f.notice()?.status, 'failed')
  f.advance(59999); await f.tick(); assert.equal(f.sent.length, 2)
  f.env.ARIANA_EMAIL = 'different@example.test'; f.env.EMAIL_FROM = 'Different <different@example.test>'
  f.advance(1); f.state.networkError = false; await f.tick()
  assert.deepEqual(f.sent[2], first); assert.equal(f.notice()?.status, 'accepted')
})

test('aceptación seguida de fallo D1 recupera la misma operación tras expirar el lease', async () => {
  const f = await setup(); await f.ready(); f.db.failAcceptedWrite = true
  await f.tick(); assert.equal(f.notice()?.status, 'sending'); assert.equal(f.accepted.size, 2)
  await f.tick(); assert.equal(f.sent.length, 2)
  f.advance(45001); await f.tick()
  assert.equal(f.notice()?.status, 'accepted'); assert.equal(f.accepted.size, 2)
  assert.deepEqual(f.sent[1], f.sent[2])
})

test('eventos sin cambios semánticos no impiden recuperar un envío incierto', async () => {
  const f = await setup(); await f.ready(); f.db.failAcceptedWrite = true; await f.tick()
  f.advance(45001)
  await f.ingest(f.booking({ eventKey: 'same-booking-facts', occurredAt: f.io.now() }))
  await f.ingest(f.payment({ eventKey: 'same-payment-facts', occurredAt: f.io.now() }))
  await f.tick(); assert.equal(f.notice()?.status, 'accepted'); assert.equal(f.accepted.size, 2)
  assert.deepEqual(f.sent[1], f.sent[2])
})

test('409 concurrente y Retry-After largo se reintentan sin romper la ventana segura', async () => {
  const f = await setup(); await f.ready()
  let busy = true
  const io = { ...f.io, fetch: async () => busy
    ? Response.json({ name: 'concurrent_idempotent_requests' }, { status: 409 })
    : Response.json({}, { status: 429, headers: { 'Retry-After': '90000' } }) }
  await processSessionNotifications(f.env, io)
  assert.equal(f.notice()?.status, 'failed'); assert.equal(f.notice()?.error_code, 'PROVIDER_BUSY')
  busy = false; f.advance(60000); await processSessionNotifications(f.env, io)
  assert.equal(f.notice()?.status, 'review_required'); assert.equal(f.notice()?.error_code, 'RETRY_WINDOW_EXPIRED')
})

test('concurrencia de envío obtiene un único lease', async () => {
  const f = await setup(); await f.ready()
  let release!: () => void
  f.state.sendDelay = new Promise<void>(resolve => { release = resolve })
  const first = deliverSessionNotification(f.env, f.base.bookingUid, f.io)
  for (let i = 0; i < 50 && f.sent.length < 2; i++) await new Promise(resolve => setTimeout(resolve, 1))
  assert.equal(f.sent.length, 2)
  await f.tick(); assert.equal(f.sent.length, 2); release(); await first
  assert.equal(f.notice()?.status, 'accepted')
})

test('cambio de cita antes del primer intento actualiza el contenido; después exige revisión', async () => {
  for (const attempted of [false, true]) {
    const f = await setup(); await f.ready()
    if (attempted) { f.state.networkError = true; await f.tick(); f.advance(60000) }
    const event = f.booking() as Extract<SessionEvent, { kind: 'booking' }>
    await f.ingest(f.booking({ eventKey: 'rescheduled', occurredAt: f.io.now() + 1, appointment: { ...event.appointment!, start: '2027-03-29T09:00:00Z', end: '2027-03-29T09:40:00Z' } }))
    f.state.networkError = false; await f.tick()
    assert.equal(f.notice()?.status, attempted ? 'review_required' : 'accepted')
    assert.equal(f.sent.length, 2)
    if (!attempted) assert.match(String(f.sent[1].payload.text), /29 de marzo/)
  }
})

test('ventana de 23 horas y límite de ocho intentos no generan una clave nueva', async () => {
  for (const limit of ['window','attempts']) {
    const f = await setup(); await f.ready(); f.state.networkError = true
    await f.tick(); const key = f.notice()?.email_key
    if (limit === 'window') f.advance(23 * 3600000)
    else for (let i = 1; i < 8; i++) { f.advance(3600000); await f.tick() }
    await f.tick(); assert.equal(f.notice()?.status, 'review_required'); assert.equal(f.notice()?.email_key, key)
    const sent = f.sent.length; f.advance(48 * 3600000); await f.tick(); assert.equal(f.sent.length, sent)
  }
})

for (const code of [400,401,403,409,429,500]) test(`respuesta Resend ${code}: clasificación y reintento acotado`, async () => {
  const f = await setup(); await f.ready(); f.state.providerStatus = code; await f.tick()
  assert.equal(f.notice()?.status, code === 429 || code === 500 ? 'failed' : 'review_required')
  assert.doesNotMatch(JSON.stringify(f.notice()), /Provider detail/)
})

test('configuración y destinatarios bloquean sin consumir intentos; mock local nunca llama al proveedor', async () => {
  const f = await setup(); await f.ready(); f.env.BOOKING_NOTIFICATIONS_ENABLED = 'false'
  await f.tick(); assert.equal(f.sent.length, 1)
  f.env.BOOKING_NOTIFICATIONS_ENABLED = 'true'; f.env.EMAIL_TEST_RECIPIENTS = 'traveler@example.test'
  await f.tick(); assert.equal(f.notice()?.error_code, 'EMAIL_RECIPIENT_NOT_ALLOWED'); assert.equal(f.notice()?.attempts, 0)
  assert.equal(f.notice()?.first_attempt_at, null)
  f.env.EMAIL_MODE = 'disabled'; await f.tick(); assert.equal(f.sent.length, 1)
  f.env.ENVIRONMENT = 'development'; f.env.EMAIL_MODE = 'resend'; await f.tick(); assert.equal(f.sent.length, 1)
  f.env.EMAIL_MODE = 'mock'; await f.tick(); assert.equal(f.notice()?.status, 'simulated'); assert.equal(f.sent.length, 1)
  f.env.ENVIRONMENT = 'production'; f.env.EMAIL_MODE = 'resend'; await f.tick(); assert.equal(f.sent.length, 1)
})

test('restricción de pruebas evalúa el destinatario persistido tras un envío incierto', async () => {
  const f = await setup(); await f.ready(); f.state.networkError = true; await f.tick(); f.advance(60000)
  f.env.ARIANA_EMAIL = 'new@example.test'; f.env.EMAIL_TEST_RECIPIENTS = 'new@example.test'
  await f.tick(); assert.equal(f.sent.length, 2); assert.equal(f.notice()?.attempts, 1)
  assert.equal(f.notice()?.error_code, 'EMAIL_RECIPIENT_NOT_ALLOWED')
})

test('referencia opaca estable, privada y sin autorización de lectura', async () => {
  const f = await setup(); const ref = f.request.booking_reference!
  assert.match(ref, /^[a-f0-9]{64}$/); assert.notEqual(ref, f.token)
  const response = await f.create(); assert.doesNotMatch(await response.text(), new RegExp(ref))
  assert.equal((await readRequest(f.env, f.id))?.booking_reference, ref)
  assert.equal((await f.call(`/api/trip-requests/${f.id}`, undefined, { Authorization: `Bearer ${ref}` })).status, 404)
  assert.equal((await f.call('/api/session-events', f.payment())).status, 404)
})

test('enlace Cal.com: configuración explícita, destino válido, referencia y seis perfiles HTML/texto', () => {
  const ref = 'a'.repeat(64), config = { BOOKING_ENABLED: 'true', CAL_BOOKING_URL: 'https://cal.com/ariana/primera-sesion' }
  const link = bookingLink(config, ref)!
  assert.equal(new URL(link).searchParams.get('metadata[aripajama_reference]'), ref)
  for (const id of PROFILE_IDS) {
    const email = renderProfileEmail(id, 'https://aripajama.example', undefined, link)
    assert.ok(email.text.includes(link)); assert.ok(email.html.includes('Reserva tu primera sesión'))
    assert.ok(email.text.includes('40 €')); assert.doesNotMatch(email.text, /24–48/)
  }
  for (const url of ['http://cal.com/a/b','https://cal.com.evil/a/b','https://secret@cal.com/a/b','https://cal.com/a/b?test=1','https://cal.com/a/b#test','https://cal.com/a']) {
    assert.equal(bookingLink({ ...config, CAL_BOOKING_URL: url }, ref), undefined)
    assert.throws(() => renderProfileEmail('explorador','https://aripajama.example',undefined,url))
  }
  assert.equal(bookingLink({ ...config, BOOKING_ENABLED: 'false' }, ref), undefined)
  assert.equal(bookingLink(config), undefined)
})

test('correos de perfil ya preparados conservan contenido/idempotencia y los antiguos no reciben enlaces', async () => {
  const f = fixture(); f.state.networkError = true; await f.create()
  const payload = f.sent[0]
  f.env.BOOKING_ENABLED = 'true'; f.env.CAL_BOOKING_URL = 'https://cal.com/ariana/primera-sesion'
  f.state.networkError = false; f.advance(6000); await f.retry(); assert.deepEqual(f.sent[1], payload)
  const old = fixture()
  old.env.EMAIL_MODE = 'disabled'; await old.create()
  old.db.db.prepare('UPDATE trip_requests SET booking_reference = NULL WHERE id = ?').run(old.id)
  old.env.EMAIL_MODE = 'resend'; old.env.BOOKING_ENABLED = 'true'; old.env.CAL_BOOKING_URL = f.env.CAL_BOOKING_URL
  await old.retry(); assert.ok(!String(old.sent[0].payload.text).includes('https://cal.com/'))
})

test('52 opciones: mapeo legible completo y multiselección sin modificar el algoritmo', () => {
  let total = 0
  for (const question of TRIP_QUESTIONS) {
    const mapping = ANSWER_MAP[question.id]
    assert.deepEqual(Object.keys(PROFILE_QUESTIONS[mapping.id].options).sort(), Object.values(mapping.options).sort())
    for (const option of question.options) {
      const answers = canonicalAnswers() as Record<string, string[]>
      answers[mapping.id] = [mapping.options[option.id]]
      const readable = readableAnswers(JSON.stringify(answers)).find(item => item.question === question.title)!
      assert.deepEqual(readable.answers, [option.title]); total++
    }
    if (question.mode === 'multiple') {
      const answers = { ...canonicalAnswers(), [mapping.id]: question.options.map(option => mapping.options[option.id]) }
      assert.equal(readableAnswers(JSON.stringify(answers)).find(item => item.question === question.title)?.answers.length, question.options.length)
    }
  }
  assert.equal(total, 52)
})

test('email interno escapa HTML, conserva saltos y por definir, rechaza URLs y zonas inválidas', async () => {
  const f = await setup(); await f.ready()
  const request = (await readRequest(f.env, f.id))!, booking = (await readBooking(f.env, f.base.bookingUid))!
  request.details_json = JSON.stringify({ destinationUnknown: true, daysUnknown: true, seasonUnknown: true, budgetUnknown: true, company: 'unknown', needs: '<script>alert("x")</script>\n& necesidades' })
  const a = JSON.parse(booking.appointment_json!)
  a.name = '<img src=x onerror=alert(1)>'; booking.appointment_json = JSON.stringify(a)
  const result = renderSessionEmail(request, booking)
  assert.doesNotMatch(result.html, /<script|<img/); assert.match(result.html, /&lt;script&gt;/)
  assert.match(result.text, /<script>/); assert.equal(result.text.match(/Aún por definir/g)?.length, 5)
  assert.match(result.html, /<br>&amp; necesidades/)
  for (const videoUrl of ['javascript:alert(1)','http://meet.example/test','https://secret@meet.example/test']) {
    await assert.rejects(f.ingest(f.booking({ eventKey: 'bad-video', appointment: { ...a, videoUrl } })))
  }
  await assert.rejects(f.ingest(f.booking({ eventKey: 'bad-zone', appointment: { ...a, timeZone: 'Invalid/Zone' } })))
})

test('migración sobre solicitudes existentes mantiene filas/correos y valida restricciones SQL', async () => {
  const f = await setup(), old = new SqliteD1(['0001_trip_requests.sql'])
  const row = { ...f.db.db.prepare('SELECT * FROM trip_requests').get()! }; delete row.booking_reference
  const keys = Object.keys(row)
  old.db.prepare(`INSERT INTO trip_requests (${keys.join(',')}) VALUES (${keys.map(() => '?').join(',')})`).run(...Object.values(row) as never[])
  old.db.exec(readFileSync(new URL('../../migrations/0002_first_sessions.sql', import.meta.url), 'utf8'))
  const migrated = { ...old.db.prepare('SELECT * FROM trip_requests').get()! }
  assert.equal(migrated.booking_reference, null); delete migrated.booking_reference; assert.deepEqual(migrated, row)
  await f.ready()
  assert.throws(() => f.db.db.prepare('UPDATE session_bookings SET request_id = ?').run('missing-request'))
  assert.throws(() => f.db.db.prepare('UPDATE session_bookings SET amount_cents = ?').run(-1))
  assert.throws(() => f.db.db.prepare('UPDATE session_bookings SET amount_cents = ?').run(40.5))
  const id = 'duplicate_reference_request_001'
  await f.create({ ...f.payload(), requestId: id })
  assert.throws(() => f.db.db.prepare('UPDATE trip_requests SET booking_reference = ? WHERE id = ?').run(f.base.reference, id))
})
