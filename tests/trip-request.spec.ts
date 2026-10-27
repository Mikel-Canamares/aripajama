import { expect, test } from '@playwright/test'
import { DRAFT_KEY } from '../src/data/questionnaire'
import { emptyTripDetails, enterEmail, filledDetails, finishUnknownDetails, mockTripApi, seedFinalDraft } from './trip-request-helpers'

test('detalles prácticos obligatorios, alternativas por definir y email validado', async ({ page }) => {
  const state = await mockTripApi(page)
  await seedFinalDraft(page,{ details:emptyTripDetails() })
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/detalles')
  await expect(page.locator('.trip-final h1')).toBeFocused()
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('#trip-destination')).toBeFocused()
  await expect(page.getByRole('alert')).toContainText('Indica un destino')
  await finishUnknownDetails(page)
  await page.locator('#trip-email').fill('incompleto')
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('#trip-email')).toBeFocused()
  await expect(page.getByRole('alert')).toContainText('dirección de email válida')
  await page.locator('#trip-email').fill('traveler@example.test')
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('#trip-consent')).toBeFocused()
  await page.locator('#trip-consent').check()
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil está en camino.')
  await expect(page.getByRole('status').first()).toContainText('enviado para su entrega a traveler@example.test')
  expect(state.posts).toHaveLength(1)
  expect(state.posts[0].details).toEqual({ ...emptyTripDetails(),destinationUnknown:true,daysUnknown:true,seasonUnknown:true,budgetUnknown:true,company:'family' })
  expect(state.posts[0]).not.toHaveProperty('profile')
  expect(await page.content()).not.toContain('puntuaciones')
})

test('doble pulsación, recarga, revisión y reinicio no duplican el envío', async ({ page }) => {
  const state = await mockTripApi(page)
  let release!: () => void
  state.release = new Promise<void>(resolve => { release = resolve })
  await seedFinalDraft(page)
  await enterEmail(page)
  await page.locator('#trip-email-submit').dblclick()
  await expect.poll(() => state.posts.length).toBe(1)
  await expect(page.locator('#trip-email-submit')).toBeDisabled()
  release()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil está en camino.')
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
  expect(draft.details).toEqual(emptyTripDetails()); expect(draft.email).toBe(''); expect(draft.request).toBeNull()
})

test('fallo del correo conserva solicitud y reintenta con la misma identidad privada', async ({ page }) => {
  const state = await mockTripApi(page,'failed')
  await seedFinalDraft(page)
  await enterEmail(page)
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu solicitud está guardada.')
  await expect(page.getByRole('status').first()).toContainText('no hemos podido confirmar el envío')
  state.status = 'accepted'
  await page.locator('#trip-email-retry').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil está en camino.')
  expect(state.posts).toHaveLength(1); expect(state.retries).toHaveLength(1)
  expect(state.retries[0].authorization).toBe(`Bearer ${state.posts[0].retryToken}`)
  expect(page.url()).not.toContain(String(state.posts[0].retryToken))
})

for (const status of ['unconfigured','simulated','review_required'] as const) test(`confirma estado ${status} sin afirmar envío o entrega`, async ({ page }) => {
  await mockTripApi(page,status)
  await seedFinalDraft(page)
  await enterEmail(page)
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu solicitud está guardada.')
  const message = page.getByRole('status').first()
  await expect(message).toContainText(status === 'review_required' ? 'revisar el estado' : 'no se ha enviado ningún correo')
  if (status === 'review_required') await expect(page.locator('#trip-email-retry')).toHaveCount(0)
})

test('mantiene detalles, email, scroll y foco al volver, recargar y recorrer el historial', async ({ page }) => {
  await mockTripApi(page)
  await seedFinalDraft(page)
  await enterEmail(page)
  await page.keyboard.press('Escape')
  await expect(page.locator('.trip-final h1')).toHaveText('Cuéntame los detalles prácticos.')
  await expect(page.locator('.trip-final h1')).toBeFocused()
  await page.locator('#trip-details-continue').click()
  await expect(page.locator('#trip-email')).toHaveValue('traveler@example.test')
  await expect(page.locator('#trip-consent')).toBeChecked()
  await page.reload()
  await expect(page.locator('#trip-email')).toHaveValue('traveler@example.test')
  await page.goBack()
  await expect(page.locator('#trip-details-continue')).toBeFocused()
  await page.goForward()
  await expect(page.locator('.trip-final h1')).toBeFocused()
})

test('una verificación no configurada no guarda ni finge un envío', async ({ page }) => {
  const state = await mockTripApi(page)
  await page.route('**/api/trip-config',route => route.fulfill({ json:{ turnstileSiteKey:null,localVerification:false } }))
  await seedFinalDraft(page)
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/email')
  await page.locator('#trip-email').fill('traveler@example.test'); await page.locator('#trip-consent').check()
  await page.locator('#trip-email-submit').click()
  await expect(page.getByRole('alert')).toContainText('Completa la verificación')
  expect(state.posts).toHaveLength(0)
  await expect(page).toHaveURL(/cuestionario\/email$/)
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
  await page.goto('/#crear-mi-viaje/cuestionario/email')
  await expect(page.getByRole('status')).toContainText('No se ha podido preparar')
  await page.getByRole('button',{ name:'Reintentar verificación' }).click()
  await expect(page.getByText('Widget simulado')).toBeVisible()
  await page.evaluate(() => {
    const verification = (window as unknown as { testVerification: Record<string,(token?:string) => void> }).testVerification
    verification.callback('expired-test-token'); verification['expired-callback']()
  })
  await page.locator('#trip-email').fill('traveler@example.test'); await page.locator('#trip-consent').check()
  await page.locator('#trip-email-submit').click()
  await expect(page.getByRole('alert')).toContainText('Completa la verificación')
  expect(state.posts).toHaveLength(0)
  await page.evaluate(() => (window as unknown as { testVerification:{ callback:(token:string) => void } }).testVerification.callback('renewed-test-token'))
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil está en camino.')
  expect(state.posts[0].turnstileToken).toBe('renewed-test-token')
})

test('un error de red conserva el intento y permite repetir la confirmación sin cambiar su identidad', async ({ page }) => {
  await page.route('**/api/trip-config',route => route.fulfill({ json:{ turnstileSiteKey:null,localVerification:true } }))
  const attempts: Record<string,unknown>[] = []
  await page.route('**/api/trip-requests**',async route => {
    if (route.request().method() === 'GET') { await route.fulfill({ status:404,json:{ code:'REQUEST_NOT_FOUND' } }); return }
    const data = route.request().postDataJSON(); attempts.push(data)
    if (attempts.length === 1) { await route.abort('failed'); return }
    await route.fulfill({ json:{ requestId:data.requestId,saved:true,emailStatus:'accepted',canRetry:false } })
  })
  await seedFinalDraft(page); await enterEmail(page)
  await page.locator('#trip-email-submit').click()
  await expect(page.getByRole('alert')).toContainText('No hemos podido confirmar el registro')
  await expect(page).toHaveURL(/cuestionario\/email$/)
  await page.locator('#trip-email-submit').click()
  await expect(page.locator('.trip-final h1')).toHaveText('Tu perfil está en camino.')
  expect(attempts).toHaveLength(2)
  expect(attempts[0].requestId).toBe(attempts[1].requestId)
  expect(attempts[0].retryToken).toBe(attempts[1].retryToken)
})

test('enlaces directos no permiten confirmar sin completar datos anteriores', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' })
  await page.goto('/#crear-mi-viaje/cuestionario/completado')
  await expect(page).toHaveURL(/cuestionario\/1$/)
  await seedFinalDraft(page,{ details:emptyTripDetails() })
  await page.goto('/#crear-mi-viaje/cuestionario/email'); await page.reload()
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
  await page.goto('/#crear-mi-viaje/cuestionario/completado')
  await expect(page).toHaveURL(/cuestionario\/detalles$/)
})

test('las nuevas pantallas se adaptan de 280 a 1440 px y a texto al 200 %', async ({ page },testInfo) => {
  test.slow()
  await mockTripApi(page)
  await seedFinalDraft(page,{ receipt:'accepted' })
  await page.emulateMedia({ reducedMotion:'reduce' })
  for (const viewport of [{ width:280,height:568 },{ width:390,height:844 },{ width:768,height:1024 },{ width:941,height:1672 },{ width:1440,height:900 },{ width:844,height:390 }]) {
    await page.setViewportSize(viewport)
    for (const route of ['detalles','email','completado']) {
      await page.goto(`/#crear-mi-viaje/cuestionario/${route}`)
      await expect(page.locator('.trip-final h1')).toHaveText({ detalles:'Cuéntame los detalles prácticos.',email:'Tu perfil viajero, en tu email.',completado:'Tu perfil está en camino.' }[route]!)
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
  for (const route of ['detalles','email','completado']) {
    await page.goto(`/#crear-mi-viaje/cuestionario/${route}`)
    await expect(page.locator('.trip-final h1')).toHaveText({ detalles:'Cuéntame los detalles prácticos.',email:'Tu perfil viajero, en tu email.',completado:'Tu perfil está en camino.' }[route]!)
    await expect(page.locator('.trip-final h1')).toBeFocused()
    await page.addStyleTag({ content:'html { font-size:200%; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.screenshot({ path:testInfo.outputPath(`trip-${route}-text-200.png`),fullPage:true })
  }
})
