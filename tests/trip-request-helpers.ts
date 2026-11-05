import { expect, type Page } from '@playwright/test'
import { DRAFT_KEY, TRIP_QUESTIONS } from '../src/data/questionnaire'
import { emptyTripDetails, type EmailStatus, type TripDetails } from '../src/data/trip-request'

export const filledDetails = (): TripDetails => ({ destination:'Japón',destinationUnknown:false,days:'14',daysUnknown:false,season:'Primavera',seasonUnknown:false,company:'couple',budget:'2500',budgetUnknown:false,needs:'' })
export async function seedFinalDraft(page: Page, options: { details?: TripDetails; receipt?: EmailStatus } = {}) {
  const answers = Object.fromEntries(TRIP_QUESTIONS.map(question => [question.id,[question.options[0].id]]))
  const request = options.receipt ? { id:'browser_fixture_000000000001',token:'a'.repeat(64) } : null
  const receipt = request ? { requestId:request.id,saved:true,emailStatus:options.receipt,canRetry:options.receipt !== 'accepted' } : null
  const initialize = ({ key, draft }: { key: string; draft: unknown }) => {
    if (!sessionStorage.getItem('trip-test-seeded')) { sessionStorage.setItem(key,JSON.stringify(draft)); sessionStorage.setItem('trip-test-seeded','true') }
  }
  const initial = { key:DRAFT_KEY,draft:{ version:2,answers,step:10,details:options.details || filledDetails(),email:options.receipt ? 'traveler@example.test' : '',consent:!!options.receipt,request,receipt } }
  await page.addInitScript(initialize,initial)
  if (page.url().startsWith('http://127.0.0.1:4173/')) { await page.evaluate(initialize,initial); await page.reload() }
}
export async function mockTripApi(page: Page, initial: EmailStatus = 'accepted') {
  const state = { status:initial, storedStatus:initial, posts:[] as Record<string,unknown>[], retries:[] as { authorization: string; data: Record<string,unknown> }[], release: null as Promise<void> | null }
  await page.route('**/api/trip-config', route => route.fulfill({ json:{ turnstileSiteKey:null,localVerification:true } }))
  await page.route('**/api/trip-requests**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    let id = url.pathname.split('/')[3]
    if (request.method() === 'POST' && url.pathname === '/api/trip-requests') {
      const data = request.postDataJSON(); state.posts.push(data); id = data.requestId
      if (state.release) await state.release
    } else if (request.method() === 'POST') {
      state.retries.push({ authorization:request.headers().authorization,data:request.postDataJSON() })
    }
    // A status query observes the last completed mutation, not the next provider response.
    if (request.method() === 'POST') state.storedStatus = state.status
    const status = state.storedStatus
    await route.fulfill({ json:{ requestId:id,saved:true,emailStatus:status,canRetry:['failed','unconfigured','simulated'].includes(status) } })
  })
  return state
}
export async function enterEmail(page: Page) {
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/email')
  await expect(page.locator('.trip-final h1')).toBeFocused()
  await expect(page.getByRole('status')).toHaveText('Verificación preparada.')
  await page.locator('#trip-email').fill('traveler@example.test')
  await page.locator('#trip-consent').check()
}
export async function finishUnknownDetails(page: Page) {
  for (const id of ['destination','days','season','budget']) {
    const card = page.locator(`#trip-summary-${id}`).locator('..')
    if (await card.getAttribute('open') === null) await page.locator(`#trip-summary-${id}`).click()
    await card.getByRole('checkbox',{ name:'Aún por definir' }).check()
  }
  const company = page.locator('#trip-summary-company').locator('..')
  if (await company.getAttribute('open') === null) await page.locator('#trip-summary-company').click()
  await page.locator('#trip-company').selectOption('family')
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil viajero, en tu email.')
  await expect(page.locator('.trip-final h1')).toBeFocused()
}
export { emptyTripDetails }
