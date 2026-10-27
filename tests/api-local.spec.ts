import { expect, test } from '@playwright/test'
import { TRIP_QUESTIONS } from '../src/data/questionnaire'
import { filledDetails, seedFinalDraft } from './trip-request-helpers'
test('Worker y D1 locales guardan y recuperan la solicitud sin enviar correos reales', async ({ request }) => {
  const requestId = crypto.randomUUID().replaceAll('-','')
  const retryToken = crypto.randomUUID().replaceAll('-','') + crypto.randomUUID().replaceAll('-','')
  const payload = { requestId,retryToken,email:`local-${requestId}@example.test`,answers:Object.fromEntries(TRIP_QUESTIONS.map(q => [q.id,[q.options[0].id]])),details:filledDetails(),consent:true,website:'',turnstileToken:'local-test-token' }
  const headers = { Origin:'http://127.0.0.1:4173' }
  const response = await request.post('http://127.0.0.1:8787/api/trip-requests',{ data:payload,headers })
  expect(response.status()).toBe(201)
  const result = await response.json()
  expect(result.saved).toBe(true); expect(result.emailStatus).toBe('simulated')
  expect(JSON.stringify(result)).not.toMatch(/puntuaciones|secundario|principal|resend_id/)
  const duplicate = await request.post('http://127.0.0.1:8787/api/trip-requests',{ data:payload,headers })
  expect(duplicate.status()).toBe(200)
  const status = await request.get(`http://127.0.0.1:8787/api/trip-requests/${requestId}`,{ headers:{ Authorization:`Bearer ${retryToken}` } })
  expect(await status.json()).toEqual(await duplicate.json())
  expect((await request.get(`http://127.0.0.1:8787/api/trip-requests/${requestId}`)).status()).toBe(404)
})

test('la interfaz confirma con Worker y D1 reales en modo local simulado', async ({ page }) => {
  await seedFinalDraft(page)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/email')
  await expect(page.getByRole('status')).toHaveText('Verificación preparada.')
  await page.locator('#trip-email').fill(`ui-${crypto.randomUUID()}@example.test`)
  await page.locator('#trip-consent').check()
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu solicitud está guardada.')
  await expect(page.getByRole('status').first()).toContainText('La prueba de correo es simulada')
  await page.reload()
  await expect(page.getByRole('status').first()).toContainText('La prueba de correo es simulada')
  expect((await page.request.get('/server/profiles.ts')).status()).toBe(403)
})
