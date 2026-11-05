import { ApiError, type Env, type Io } from './platform.ts'
import { type RequestRow } from './delivery.ts'
import { ingestSessionEvent } from './sessions.ts'
import { deliverSessionNotification } from './session-delivery.ts'
import { restrictTestOwner, verifySessionTestLink } from './test-mode.ts'

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]!)
export async function sessionTestPage(request: Request, env: Env, reference: string, io: Io) {
  const url = new URL(request.url)
  if (!await verifySessionTestLink(env, url, reference, io.now())) throw new ApiError(404, 'TEST_LINK_NOT_FOUND')
  const row = await env.DB.prepare('SELECT * FROM trip_requests WHERE booking_reference = ?').bind(reference).first<RequestRow>()
  if (!row) throw new ApiError(404, 'TEST_LINK_NOT_FOUND')
  restrictTestOwner(env, row.email)
  if (row.email_status !== 'accepted') throw new ApiError(409, 'PROFILE_NOT_ACCEPTED')
  if (!['GET','POST'].includes(request.method)) throw new ApiError(405, 'METHOD_NOT_ALLOWED')
  const uid = `phase1-test-${reference}`
  // A stable example appointment; it never touches a real calendar or payment API.
  const start = new Date(row.created_at + 7 * 86400000).toISOString()
  const end = new Date(row.created_at + 7 * 86400000 + 40 * 60000).toISOString()
  if (request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/x-www-form-urlencoded')) throw new ApiError(415, 'FORM_REQUIRED')
    const reader = request.body?.getReader()
    if (!reader) throw new ApiError(400, 'INVALID_TEST_CONFIRMATION')
    let content = ''
    while (true) {
      const chunk = await reader.read()
      if (chunk.done) break
      content += new TextDecoder().decode(chunk.value)
      if (content.length > 100) { await reader.cancel(); throw new ApiError(413, 'REQUEST_TOO_LARGE') }
    }
    if (content !== 'confirm=simulate') throw new ApiError(400, 'INVALID_TEST_CONFIRMATION')
    const base = { bookingUid: uid, reference, occurredAt: row.created_at, test: true as const }
    await ingestSessionEvent(env, { ...base, eventKey: `${uid}/booking`, kind: 'booking', status: 'confirmed', appointment: {
      start, end, timeZone: 'Europe/Madrid', attendeeTimeZone: 'Europe/Madrid', email: row.email, name: null, videoUrl: null,
    } }, io)
    await ingestSessionEvent(env, { ...base, eventKey: `${uid}/payment`, kind: 'payment', status: 'confirmed',
      payment: { id: `${uid}/payment`, bookingUid: uid, amountCents: 4000, currency: 'EUR' } }, io)
    // A failed provider/DB attempt remains in the existing queue for the cron.
    try { await deliverSessionNotification(env, uid, io) } catch { /* Keep durable state for recovery. */ }
  }
  const notification = await env.DB.prepare('SELECT status FROM session_notifications WHERE booking_uid = ?').bind(uid).first<{ status: string }>()
  const accepted = notification?.status === 'accepted'
  const message = accepted ? 'Resend ha aceptado el aviso de prueba para su entrega a tu correo. Revisa tu bandeja de entrada y spam.'
    : notification?.status === 'review_required' ? 'La prueba está guardada. El estado del aviso requiere revisión antes de reenviar para evitar duplicados.'
    : notification ? 'La prueba está guardada y el aviso está pendiente. El procesador reintentará los fallos temporales automáticamente.'
    : 'Confirma para simular una reserva y un pago de 40 €. Se enviará a tu correo el aviso con las respuestas de tu formulario.'
  const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(new Date(start))
  return new Response(`<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Prueba de primera sesión · Aripajama</title></head><body style="margin:0;background:#f5f2ed;color:#273047;font:18px/1.6 Georgia,serif"><main style="max-width:640px;padding:24px;margin:auto;overflow-wrap:anywhere"><h1>Primera sesión · PRUEBA</h1><p><strong>No existe ninguna cita ni cobro real.</strong> No se crea un evento en el calendario ni una videollamada.</p><p>Fecha de ejemplo: ${escape(date)} · Europe/Madrid. Duración de ejemplo: 40 minutos.</p><p role="status">${message}</p>${accepted || notification?.status === 'review_required' ? '' : `<form method="post" action="${escape(url.pathname + url.search)}"><button type="submit" name="confirm" value="simulate" style="padding:14px;border:0;border-radius:8px;background:#4a0f18;color:white;font:18px Georgia,serif">${notification ? 'Comprobar y reintentar aviso' : 'Simular reserva y pago · sin cobro'}</button></form>`}<p>Repetir la confirmación no genera otra reserva ni otro aviso.</p><p><a href="/#crear-mi-viaje">Volver a Crear mi viaje</a></p></main></body></html>`, {
    headers: { 'Content-Type':'text/html; charset=utf-8', 'Cache-Control':'no-store', 'Referrer-Policy':'no-referrer', 'X-Content-Type-Options':'nosniff',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'" },
  })
}
