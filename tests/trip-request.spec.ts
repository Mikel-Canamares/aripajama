import { expect, test } from '@playwright/test'
import { DRAFT_KEY } from '../src/data/questionnaire'
import { TRAVELER_PROFILES, type ProfileId } from '../src/data/traveler-profiles'
import { emptyTripDetails, openDetails, finishUnknownDetails, mockTripApi, seedFinalDraft } from './trip-request-helpers'

test('el antiguo paso de email recupera los detalles y envía solo los nuevos campos', async ({ page }) => {
  const state = await mockTripApi(page)
  await seedFinalDraft(page)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/email')
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
  await expect(page.locator('#trip-summary-destination')).toContainText('Japón')
  await expect(page.locator('input[type=email]')).toHaveCount(0)
  await expect(page.getByRole('status')).toHaveText('Verificación preparada.')
  await page.getByRole('button', { name: 'Ver mi perfil viajero' }).click()
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  expect(state.posts).toHaveLength(1)
  expect(state.posts[0]).not.toHaveProperty('email')
  expect(state.posts[0]).not.toHaveProperty('consent')
})

test('valida detalles obligatorios y permite valores por definir', async ({ page }) => {
  const state = await mockTripApi(page)
  await seedFinalDraft(page, { details: emptyTripDetails() })
  await openDetails(page)
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('#trip-destination')).toBeFocused()
  await finishUnknownDetails(page)
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  expect(state.posts[0].details).toEqual({ ...emptyTripDetails(), destinationUnknown:true, daysUnknown:true, seasonUnknown:true, budgetUnknown:true, company:'family' })
})

for (const id of Object.keys(TRAVELER_PROFILES) as ProfileId[]) test(`presenta el perfil ${id} confirmado por la API`, async ({ page }) => {
  await mockTripApi(page, id)
  await seedFinalDraft(page)
  await openDetails(page)
  await page.getByRole('button', { name: 'Ver mi perfil viajero' }).click()
  await expect(page.locator('.trip-final h1')).toHaveText(TRAVELER_PROFILES[id].title)
  await expect(page.getByText(TRAVELER_PROFILES[id].description)).toBeVisible()
  const illustration = page.locator('.trip-final__profile img')
  await expect(illustration).toHaveAttribute('src', `/media/email/${id}-art.jpg`)
  await expect.poll(() => illustration.evaluate(img => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.getByRole('button', { name: 'Reservar mi cita' })).toBeDisabled()
  await expect(page.getByText('Reservas disponibles próximamente')).toBeVisible()
})

test('doble pulsación, recarga, revisión y reinicio no duplican el envío', async ({ page }) => {
  const state = await mockTripApi(page)
  let release!: () => void
  state.release = new Promise<void>(resolve => { release = resolve })
  await seedFinalDraft(page)
  await openDetails(page)
  await page.locator('#trip-details-continue').dblclick()
  await expect.poll(() => state.posts.length).toBe(1)
  await expect(page.locator('#trip-details-continue')).toBeDisabled()
  release()
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  await page.reload()
  await expect(page.locator('.trip-final h1')).toBeFocused()
  expect(state.posts).toHaveLength(1)
  await page.getByRole('button',{ name:'Revisar respuestas' }).click()
  await expect(page.locator('.questionnaire h1')).toHaveText('¿Qué te mueve a viajar?')
  await expect(page.getByRole('checkbox').first()).toBeChecked()
  await page.goBack()
  await expect(page.getByRole('button',{ name:'Revisar respuestas' })).toBeFocused()
  await page.getByRole('button',{ name:'Empezar de nuevo' }).click()
  await expect(page.locator('.questionnaire h1')).toHaveText('¿Qué te mueve a viajar?')
  await expect(page.locator('input:checked')).toHaveCount(0)
  const draft = await page.evaluate(key => JSON.parse(sessionStorage.getItem(key)!),DRAFT_KEY)
  expect(draft.details).toEqual(emptyTripDetails()); expect(draft).not.toHaveProperty('email'); expect(draft.request).toBeNull()
})

test('recupera la verificación tras un error de carga y exige renovar un token caducado', async ({ page }) => {
  const state = await mockTripApi(page)
  await page.route('**/api/trip-config',route => route.fulfill({ json:{ turnstileSiteKey:'fake-sitekey',localVerification:false } }))
  let scripts = 0
  await page.route(url => url.hostname === 'challenges.cloudflare.com',route => {
    if (++scripts === 1) return route.abort('failed')
    return route.fulfill({ contentType:'text/javascript',body:`window.turnstile={render:function(node,options){window.testVerification=options;node.textContent='Widget simulado';return 'test-widget'},remove:function(){}}` })
  })
  await seedFinalDraft(page)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/detalles')
  await expect(page.getByRole('status')).toContainText('No se ha podido preparar')
  await page.getByRole('button',{ name:'Reintentar verificación' }).click()
  await expect(page.getByText('Widget simulado')).toBeVisible()
  await page.evaluate(() => {
    const verification = (window as unknown as { testVerification: Record<string,(token?:string) => void> }).testVerification
    verification.callback('expired-test-token'); verification['expired-callback']()
  })
  await page.locator('#trip-details-continue').click()
  await expect(page.getByRole('alert')).toContainText('Completa la verificación')
  expect(state.posts).toHaveLength(0)
  await page.evaluate(() => (window as unknown as { testVerification:{ callback:(token:string) => void } }).testVerification.callback('renewed-test-token'))
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  expect(state.posts[0].turnstileToken).toBe('renewed-test-token')
})

test('un error de red conserva el intento y permite repetir la confirmación sin cambiar su identidad', async ({ page }) => {
  await page.route('**/api/trip-config',route => route.fulfill({ json:{ turnstileSiteKey:null,localVerification:true } }))
  const attempts: Record<string,unknown>[] = []
  await page.route('**/api/trip-requests**',async route => {
    if (route.request().method() === 'GET') { await route.fulfill({ status:404,json:{ code:'REQUEST_NOT_FOUND' } }); return }
    const data = route.request().postDataJSON(); attempts.push(data)
    if (attempts.length === 1) { await route.abort('failed'); return }
    await route.fulfill({ json:{ requestId:data.requestId,saved:true,profile:'cultural' } })
  })
  await seedFinalDraft(page); await openDetails(page)
  await page.locator('#trip-details-continue').click()
  await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el registro')
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('.trip-final h1')).toHaveText('El Cultural')
  expect(attempts).toHaveLength(2)
  expect(attempts[0].requestId).toBe(attempts[1].requestId)
  expect(attempts[0].retryToken).toBe(attempts[1].retryToken)
})

test('enlaces directos no permiten confirmar sin completar datos anteriores', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/completado')
  await expect(page).toHaveURL(/cuestionario\/1$/)
  await seedFinalDraft(page,{ details:emptyTripDetails() })
  await page.goto('/#crear-mi-viaje/cuestionario/detalles'); await page.reload()
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
  await page.goto('/#crear-mi-viaje/cuestionario/completado')
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
})

test('las nuevas pantallas se adaptan de 280 a 1440 px y a texto al 200 %', async ({ page },testInfo) => {
  test.slow()
  await mockTripApi(page)
  await seedFinalDraft(page,{ profile:'cultural' })
  await page.emulateMedia({ reducedMotion:'reduce' })
  for (const viewport of [{ width:280,height:568 },{ width:390,height:844 },{ width:768,height:1024 },{ width:941,height:1672 },{ width:1440,height:900 },{ width:844,height:390 }]) {
    await page.setViewportSize(viewport)
    for (const route of ['detalles','completado']) {
      await page.goto(`/#crear-mi-viaje/cuestionario/${route}`)
      await expect(page.locator('.trip-final h1')).toHaveText({ detalles:'Cuéntame los detalles prácticos.',completado:'El Cultural' }[route]!)
      await expect(page.locator('.trip-final h1')).toBeFocused()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      for (const control of await page.locator('.trip-final button, .trip-final summary, .trip-final input:not([type="checkbox"])').all()) {
        if (!await control.isVisible()) continue
        const box = (await control.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0); expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
      }
      const overflow = await page.locator('.trip-final h1,.trip-final p,.trip-final__field-title,.trip-final__field-hint,.trip-final button').evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent))
      expect(overflow).toEqual([])
      await page.screenshot({ path:testInfo.outputPath(`trip-${route}-${viewport.width}x${viewport.height}.png`),fullPage:true })
    }
  }
  await page.setViewportSize({ width:390,height:844 })
  for (const route of ['detalles','completado']) {
    await page.goto(`/#crear-mi-viaje/cuestionario/${route}`)
    await expect(page.locator('.trip-final h1')).toHaveText({ detalles:'Cuéntame los detalles prácticos.',completado:'El Cultural' }[route]!)
    await expect(page.locator('.trip-final h1')).toBeFocused()
    await page.addStyleTag({ content:'html { font-size:200%; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path:testInfo.outputPath(`trip-${route}-text-200.png`),fullPage:true })
  }
})
