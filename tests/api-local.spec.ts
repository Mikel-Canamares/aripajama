import { expect, test } from '@playwright/test'
import { TRIP_QUESTIONS } from '../src/data/questionnaire'
import { filledDetails, finishUnknownDetails } from './trip-request-helpers'
test('Worker y D1 locales guardan y recuperan la solicitud sin enviar correos reales', async ({ request }) => {
  const requestId = crypto.randomUUID().replaceAll('-','')
  const retryToken = crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','')
  const payload = { requestId,retryToken,answers:Object.fromEntries(TRIP_QUESTIONS.map(q => [q.id,[q.options[0].id]])),details:filledDetails(),website:'',turnstileToken:'local-test-token' }
  const headers = { Origin:'http://127.0.0.1:4173' }
  const response = await request.post('http://127.0.0.1:8787/api/trip-requests',{ data:payload,headers })
  expect(response.status()).toBe(201)
  const result = await response.json()
  expect(result.saved).toBe(true); expect(result.profile).toBe('cultural')
  expect(JSON.stringify(result)).not.toMatch(/puntuaciones|secundario|principal|resend_id/)
  const duplicate = await request.post('http://127.0.0.1:8787/api/trip-requests',{ data:payload,headers })
  expect(duplicate.status()).toBe(200)
  const status = await request.get(`http://127.0.0.1:8787/api/trip-requests/${requestId}`,{ headers:{ Authorization:`Bearer ${retryToken}` } })
  expect(await status.json()).toEqual(await duplicate.json())
  expect((await request.get(`http://127.0.0.1:8787/api/trip-requests/${requestId}`)).status()).toBe(404)
})

for (const width of [390, 1440]) test(`cuestionario completo con Worker y D1 a ${width} px`, async ({ page }) => {
  test.slow()
  await page.setViewportSize({ width, height: 900 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje')
  await page.getByRole('button', { name: 'Descubrir', exact: true }).click()
  for (const question of TRIP_QUESTIONS) {
    await expect(page.locator('.questionnaire h1')).toHaveText(question.title)
    await page.getByRole(question.mode === 'single' ? 'radio' : 'checkbox').first().check()
    await page.getByRole('button', { name: 'Continuar', exact: true }).click()
  }
  await expect(page.getByRole('status')).toHaveText('Verificación preparada.')
  await finishUnknownDetails(page)
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  await expect(page.getByRole('button', { name: 'Reservar mi cita' })).toBeDisabled()
  await page.reload()
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  expect((await page.request.get('/server/profiles.ts')).status()).toBe(403)
})
