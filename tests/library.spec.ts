import { expect, test, type Page } from '@playwright/test'

async function openLibrary(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
}

async function openHubWithMotion(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
}

test('anima ambas direcciones y bloquea interacción hasta completar el cambio', async ({ page }) => {
  await openHubWithMotion(page)
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'entering')
  await expect(page.locator('.navigation__hub')).toHaveCSS('animation-name', 'hub-depart')
  await expect(page.locator('.navigation__library')).toHaveCSS('animation-name', 'library-arrive')
  await expect(page.locator('.navigation__hub')).toHaveAttribute('inert', '')
  await expect(page.locator('.navigation__library')).toHaveAttribute('inert', '')
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'library')
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await expect(page.locator('.library__header')).toHaveCSS('animation-name', 'library-content')
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'returning')
  await expect(page.locator('.navigation__hub')).toHaveCSS('animation-name', 'hub-arrive')
  await expect(page.locator('.navigation__library')).toHaveCSS('animation-name', 'library-depart')
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'hub')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'journey')
})

test('prepara el fondo sin ocultar el hub y permite cancelar la espera', async ({ page }) => {
  await openHubWithMotion(page)
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/library/background.webp', async route => {
    await held
    await route.continue()
  })
  const button = page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })
  await button.click()
  await button.click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'preparing')
  await expect(page.locator('.navigation__hub')).toBeVisible()
  await expect(page.locator('.navigation__library')).toBeHidden()
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'hub')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'journey')
  release()
  await button.click()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
})

test('el regreso conserva la posición visual de salida después de hacer scroll', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await openHubWithMotion(page)
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await page.locator('.library__notice').scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => window.scrollY)
  expect(scroll).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'returning')
  await expect(page.locator('.navigation__library')).toHaveCSS('position', 'fixed')
  await expect(page.locator('.navigation__library')).toHaveCSS('top', `${-scroll}px`)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await expect(page.locator('.library')).toHaveCount(0)
})

test('movimiento reducido y cambios de preferencia no bloquean la navegación', async ({ page }) => {
  await openHubWithMotion(page)
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'entering')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await expect(page.locator('.navigation__library')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.library__header')).toHaveCSS('animation-name', 'none')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
})

test('un fondo detenido permite entrar con respaldo y recupera el recurso al llegar', async ({ page }) => {
  await openHubWithMotion(page)
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/library/background.webp', async route => {
    await held
    await route.continue()
  })
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'preparing')
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await expect(page.locator('.library')).toHaveAttribute('data-background', 'error')
  release()
  await expect(page.locator('.library')).toHaveAttribute('data-background', 'ready')
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
})

test('entra desde el hub y restaura el foco al volver por botón o Escape', async ({ page }) => {
  await openLibrary(page)
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toHaveCount(0)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  const libraryButton = page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })
  await expect(libraryButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(libraryButton).toBeFocused()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'journey')
  await page.keyboard.press('Escape')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
})

test('habilita países y continentes y mantiene pendientes tipos e itinerarios', async ({ page }) => {
  await openLibrary(page)
  for (const name of ['Países', 'Europa 27 viajes', 'Asia 5 viajes', 'América 5 viajes', 'África 2 viajes']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeEnabled()
  }
  await expect(page.getByRole('button', { name: 'Tipo de viaje', exact: true })).toBeDisabled()
  await expect(page.locator('#library-pending')).toBeVisible()
  await expect(page.locator('#library-pending')).toContainText('itinerarios detallados')
  await expect(page.locator('.library a')).toHaveCount(0)
})

test('conserva texto y regreso si falla el fondo o los mapas', async ({ page }) => {
  await page.route('**/media/library/**', route => route.abort())
  await openLibrary(page)
  await expect(page.locator('.library')).toHaveAttribute('data-background', 'error')
  await expect(page.getByRole('button', { name: 'Europa 27 viajes' })).toBeVisible()
  await page.getByRole('button', { name: 'Volver', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
})

test('mobile first sin desbordamientos en vertical, horizontal y escritorio', async ({ page }, testInfo) => {
  test.slow()
  for (const viewport of [
    { width: 280, height: 568 },
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 941, height: 1672 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openLibrary(page)
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.locator('.library img').evaluateAll(images => images.every(image => {
      const img = image as HTMLImageElement
      return img.complete && img.naturalWidth > 0
    }))).toBe(true)
    const size = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth }))
    expect(size.scrollWidth).toBeLessThanOrEqual(size.width)
    for (const button of await page.locator('.library button').all()) {
      const box = (await button.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(await button.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    }
    await page.screenshot({ path: testInfo.outputPath(`library-${viewport.width}x${viewport.height}.png`), fullPage: true })
    await page.locator('.library__notice').scrollIntoViewIfNeeded()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBe(0)
  }
})
