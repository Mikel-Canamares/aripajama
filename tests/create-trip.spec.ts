import { expect, test, type Page } from '@playwright/test'

const title = (page: Page) => page.locator('.create-trip h1')
const hubButton = (page: Page) => page.getByRole('button', { name: 'Crear mi viaje', exact: true })

async function openHub(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
}

test('entra desde el hub y restaura el foco con Volver, Escape e historial', async ({ page }) => {
  await openHub(page)
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(hubButton(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(title(page)).toBeFocused()
  await expect(page).toHaveURL(/#crear-mi-viaje$/)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(hubButton(page)).toBeFocused()
  await page.goForward()
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
  await page.goForward()
  await expect(title(page)).toBeFocused()
  await page.goBack()
  await expect(hubButton(page)).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('admite enlace directo y recarga sin portada, y regreso local seguro', async ({ page }) => {
  const videoRequests: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) videoRequests.push(request.url()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje')
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'ready')
  await page.reload()
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.intro')).toHaveCount(0)
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(hubButton(page)).toBeFocused()
  await expect(page).not.toHaveURL(/#crear-mi-viaje/)
  expect(videoRequests).toEqual([])
})

test('conserva los textos, los cuatro pasos y las acciones pendientes sin enlaces ficticios', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje')
  await expect(title(page)).toHaveText('No hay dosformas igualesde viajar.')
  await expect(page.locator('.create-trip__steps > li')).toHaveCount(4)
  await expect(page.locator('.create-trip__step h3')).toHaveText(['Te descubro', 'Lo imaginamos juntos', 'Diseño tu itinerario', 'Lo hacemos realidad'])
  await expect(page.getByRole('button', { name: 'Descubrir', exact: true })).toBeDisabled()
  await expect(page.getByRole('button', { name: 'Hablemos', exact: true })).toBeDisabled()
  await expect(page.locator('#create-trip-discover-pending')).toBeVisible()
  await expect(page.locator('#create-trip-contact-pending')).toBeVisible()
  await expect(page.locator('.create-trip a, .create-trip input, .create-trip form')).toHaveCount(0)
})

test('anima la entrada y el regreso desde scroll, sin interacción durante el cambio', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await openHub(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await hubButton(page).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'entering')
  await expect(page.locator('.navigation__create')).toHaveCSS('animation-name', 'library-arrive')
  await expect(page.locator('.navigation__create')).toHaveAttribute('inert', '')
  await expect(page.locator('.navigation__hub')).toHaveAttribute('inert', '')
  await page.keyboard.press('Escape')
  await expect(title(page)).toBeFocused()
  await page.locator('.create-trip__footer').scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => window.scrollY)
  expect(scroll).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'returning')
  await expect(page.locator('.navigation__create')).toHaveCSS('top', `${-scroll}px`)
  await expect(hubButton(page)).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('cambiar a movimiento reducido durante la entrada no bloquea la navegación', async ({ page }) => {
  await openHub(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await hubButton(page).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'entering')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.navigation__create')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.create-trip__header')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
})

test('permite cancelar la preparación y recupera un fondo que termina de cargar tarde', async ({ page }) => {
  await openHub(page)
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/create-trip/background.webp', async route => { await held; await route.continue() })
  await hubButton(page).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'preparing')
  await expect(page.locator('.navigation__create')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'hub')
  await hubButton(page).click()
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'error')
  release()
  await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'ready')
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
})

test('mantiene el contenido legible y permite regresar si fallan los recursos gráficos', async ({ page }) => {
  await page.route('**/media/create-trip/**', route => route.abort())
  await openHub(page)
  await hubButton(page).click()
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'error')
  await expect(page.getByRole('heading', { name: 'Diseño tu itinerario' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
})

test('se adapta a móvil, tablet y escritorio sin desbordamientos', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [
    { width: 280, height: 568 }, { width: 390, height: 844 },
    { width: 768, height: 1024 }, { width: 941, height: 1672 },
    { width: 844, height: 390 }, { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/#crear-mi-viaje')
    await expect(title(page)).toBeFocused()
    await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'ready')
    await expect.poll(() => page.locator('.create-trip img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    for (const control of await page.locator('.create-trip button').all()) {
      const box = (await control.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(await control.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    }
    const steps = await page.locator('.create-trip__step').all()
    const first = (await steps[0].boundingBox())!
    const second = (await steps[1].boundingBox())!
    if (viewport.width >= 900) expect(second.y).toBe(first.y)
    else expect(second.y).toBeGreaterThanOrEqual(first.y + first.height)
    const cards = await page.locator('.create-trip__card').all()
    const cardOne = (await cards[0].boundingBox())!
    const cardTwo = (await cards[1].boundingBox())!
    if (viewport.width >= 360) expect(cardTwo.y).toBe(cardOne.y)
    else expect(cardTwo.y).toBeGreaterThanOrEqual(cardOne.y + cardOne.height)
    await page.screenshot({ path: testInfo.outputPath(`create-trip-${viewport.width}x${viewport.height}.png`), fullPage: true })
  }
})

test('mantiene textos y controles al ampliar el texto al 200 %', async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje')
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.create-trip')).toHaveAttribute('data-background', 'ready')
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  const overflowing = await page.locator('.create-trip h1, .create-trip h2, .create-trip h3, .create-trip p, .create-trip button, .create-trip small').evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => ({ text: el.textContent, width: el.clientWidth, scrollWidth: el.scrollWidth })))
  expect(overflowing).toEqual([])
  await page.screenshot({ path: testInfo.outputPath('create-trip-text-200.png'), fullPage: true })
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
})
