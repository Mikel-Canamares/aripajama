import { renderSessionEmail } from '../server/session-email.ts'
import { ANSWER_MAP, PROFILE_QUESTIONS } from '../server/profiles.ts'
import { TRIP_QUESTIONS } from '../src/data/questionnaire-content.ts'
import { bookingLink } from '../server/booking-link.ts'

// Fictitious data used only by local previews and browser tests, never sent.
export const previewBookingLink = bookingLink({ BOOKING_ENABLED: 'true', CAL_BOOKING_URL: 'https://cal.com/ariana-demo/primera-sesion' }, 'a'.repeat(64))!
export const previewSignedTestLink = `https://preview.example.test/api/session-test/${'b'.repeat(64)}?expires=1893456000000&signature=${'a'.repeat(64)}`
export const sessionPreview = (testing = false) => renderSessionEmail({
  id: 'request_preview_00000000000001', email: 'formulario@example.test', profile_json: JSON.stringify({ principal: 'explorador' }),
  answers_json: JSON.stringify(Object.fromEntries(TRIP_QUESTIONS.map(question => {
    const mapping = ANSWER_MAP[question.id]
    const options = Object.keys(PROFILE_QUESTIONS[mapping.id].options)
    return [mapping.id, question.mode === 'single' ? [options[0]] : options]
  }))),
  details_json: JSON.stringify({ destinationUnknown: true, daysUnknown: true, seasonUnknown: true, budgetUnknown: true, company: 'unknown',
    needs: 'Comida vegetariana y tiempo para descansar.\nCaracteres especiales: < > & " y acentos. ' + 'Necesidades del viaje. '.repeat(35) }),
}, {
  uid: 'booking_preview_0000001', is_test: testing ? 1 : 0, appointment_json: JSON.stringify({
    start: '2027-03-28T08:00:00Z', end: '2027-03-28T08:40:00Z', timeZone: 'Europe/Madrid', attendeeTimeZone: 'America/New_York',
    name: 'Viajera de prueba con nombre largo '.repeat(4), email: 'reserva@example.test', videoUrl: 'https://meet.google.com/ejemplo-simulado',
  }),
})
