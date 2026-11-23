import { expect, type Page } from '@playwright/test'
import { DRAFT_KEY, TRIP_QUESTIONS } from '../src/data/questionnaire'
import { emptyTripDetails, type TripDetails } from '../src/data/trip-request'

import type { ProfileId } from '../src/data/traveler-profiles'

export const filledDetails = (): TripDetails => ({ destination:'Japón',destinationUnknown:false,days:'14',daysUnknown:false,season:'Primavera',seasonUnknown:false,company:'couple',budget:'2500',budgetUnknown:false,needs:'' })
export async function seedFinalDraft(page: Page, options: { details?: TripDetails; profile?: ProfileId } = {}) {
  const answers = Object.fromEntries(TRIP_QUESTIONS.map(question => [question.id,[question.options[0].id]]))
  const request = options.profile ? { id:'browser_fixture_000000000001',token:'a'.repeat(64) } : null
  const receipt = request ? { requestId:request.id,saved:true,profile:options.profile } : null
  const initialize = ({ key, draft }: { key: string; draft: unknown }) => {
    if (!sessionStorage.getItem('trip-test-seeded')) { sessionStorage.setItem(key,JSON.stringify(draft)); sessionStorage.setItem('trip-test-seeded','true') }
  }
  const initial = { key:DRAFT_KEY,draft:{ version:2,answers,step:10,details:options.details || filledDetails(),email:'legacy@example.test',consent:true,request,receipt } }
  await page.addInitScript(initialize,initial)
  if (page.url().startsWith('http://127.0.0.1:4173/')) { await page.evaluate(initialize,initial); await page.reload() }
}
export async function mockTripApi(page: Page, profile: ProfileId = 'cultural') {
  const state = { posts: [] as Record<string, unknown>[], release: null as Promise<void> | null }
  await page.route('**/api/trip-requests', async route => {
    const data = route.request().postDataJSON()
    state.posts.push(data)
    if (state.release) await state.release
    await route.fulfill({ status: 201, json: { requestId: data.requestId, saved: true, profile } })
  })
  return state
}
export async function openDetails(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/detalles')
  await expect(page.locator('.trip-final h1')).toBeFocused()
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
  await expect(page.locator('.trip-final h1')).toBeFocused()
}
export { emptyTripDetails }
