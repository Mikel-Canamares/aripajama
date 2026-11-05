import { TRIP_QUESTIONS } from '../src/data/questionnaire-content.ts'
import { TRAVEL_COMPANIES, type TripDetails } from '../src/data/trip-request.ts'
import { ANSWER_MAP, PROFILE_TITLES, validateCanonicalAnswers, type ProfileId } from './profiles.ts'
import { safeVideoUrl, type Appointment, type BookingRow } from './sessions.ts'
import type { RequestRow } from './delivery.ts'

const escape = (value: string) => value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!)
export function readableAnswers(json: string) {
  const answers = validateCanonicalAnswers(JSON.parse(json))
  return TRIP_QUESTIONS.map(question => {
    const mapping = ANSWER_MAP[question.id]
    const selected = answers[mapping.id]
    const options = question.options.filter(option => selected.includes(mapping.options[option.id]))
    if (options.length !== selected.length) throw new Error('ANSWER_LABEL_MISSING')
    return { question: question.title, answers: options.map(option => option.title) }
  })
}

export function renderSessionEmail(
  request: Pick<RequestRow, 'id' | 'email' | 'answers_json' | 'details_json' | 'profile_json'>,
  booking: Pick<BookingRow, 'uid' | 'appointment_json'> & Partial<Pick<BookingRow, 'is_test'>>,
) {
  const testing = booking.is_test === 1
  const heading = testing ? '[PRUEBA] Primera sesión simulada · 40 €' : 'Primera sesión confirmada · 40 €'
  const introduction = testing ? 'PRUEBA: reserva y pago simulados. No existe ninguna cita ni cobro real. El formulario corresponde a tu prueba.' : 'Reserva confirmada y pago verificado. Estos son los datos de la cita y el formulario completo.'
  const appointment = JSON.parse(booking.appointment_json!) as Appointment
  const details = JSON.parse(request.details_json) as TripDetails
  const profile = PROFILE_TITLES[(JSON.parse(request.profile_json) as { principal: ProfileId }).principal]
  if (!profile) throw new Error('INVALID_PROFILE')
  const format = new Intl.DateTimeFormat('es-ES', { dateStyle: 'full', timeStyle: 'short', timeZone: appointment.timeZone })
  const video = safeVideoUrl(appointment.videoUrl)
  const fields: [string, string][] = [
    ['Nombre', appointment.name || 'No facilitado'], ['Email del formulario', request.email],
    ['Email de la reserva', appointment.email], ['Inicio de la cita', format.format(new Date(appointment.start))],
    ['Fin de la cita', format.format(new Date(appointment.end))], ['Zona horaria de la cita', appointment.timeZone],
    ['Zona horaria del cliente', appointment.attendeeTimeZone], ['Videollamada', video || 'Enlace aún no disponible'],
    [testing ? 'Pago simulado (sin cobro)' : 'Pago verificado', '40 € · EUR'], ['Perfil viajero', profile],
    ['Destino', details.destinationUnknown ? 'Aún por definir' : details.destination],
    ['Duración del viaje', details.daysUnknown ? 'Aún por definir' : `${details.days} días`],
    ['Época del viaje', details.seasonUnknown ? 'Aún por definir' : details.season],
    ['Compañía del viaje', TRAVEL_COMPANIES.find(option => option.id === details.company)?.label || 'Aún por definir'],
    ['Presupuesto por persona', details.budgetUnknown ? 'Aún por definir' : `${details.budget} €`],
    ['Otras necesidades', details.needs || 'No indicadas'], ['Referencia de solicitud', request.id], ['Referencia de reserva', booking.uid],
  ]
  const answers = readableAnswers(request.answers_json)
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Primera sesión confirmada</title></head>
<body style="margin:0;background:#f5f2ed;color:#273047;font:16px/1.6 Arial,sans-serif"><table role="presentation" width="100%" style="border-collapse:collapse;table-layout:fixed"><tr><td style="padding:18px"><div style="max-width:680px;margin:auto;background:#fffefa;padding:20px;overflow-wrap:anywhere;word-break:break-word"><h1 style="font:normal 28px/1.3 Georgia,serif;color:#4a0f18">${heading}</h1>
<p>${introduction}</p>
${fields.map(([label, value]) => `<p><strong>${escape(label)}</strong><br>${label === 'Videollamada' && video ? `<a href="${escape(video)}">${escape(value)}</a>` : escape(value).replace(/\n/g, '<br>')}</p>`).join('')}
<h2 style="font:normal 24px/1.3 Georgia,serif">Cuestionario completo</h2>${answers.map((answer, index) => `<p><strong>${index + 1}. ${escape(answer.question)}</strong><br>${answer.answers.map(escape).join('<br>')}</p>`).join('')}
</div></td></tr></table></body></html>`
  const text = [heading, introduction, ...fields.map(([label, value]) => `${label}: ${value}`),
    'Cuestionario completo', ...answers.map((answer, index) => `${index + 1}. ${answer.question}\n${answer.answers.join('\n')}`)].join('\n\n')
  return { subject: testing ? '[PRUEBA] Aviso de primera sesión · Aripajama' : 'Primera sesión confirmada y pagada · Aripajama', html, text }
}
