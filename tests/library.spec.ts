import { expect, test, type Page } from '@playwright/test'

async function openLibrary(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
}

test('entra desde el hub y restaura el foco al volver por botón o Escape', async ({ page }) => {
  await openLibrary(page)
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toHaveCount(0)
  await page.keyboard.press('Shift+Tab')
  await expect(page.getByRole('button', { name: 'Volver', exact: true })).toBeFocused()
  await page.keyboard.press('Enter')
  const libraryButton = page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })
  await expect(libraryButton).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.locator('.library')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(libraryButton).toBeFocused()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'journey')
  await page.keyboard.press('Escape')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
})

test('presenta destinos pendientes sin enlaces vacíos ni resultados inventados', async ({ page }) => {
  await openLibrary(page)
  for (const name of ['Países', 'Tipo de viaje', 'Europa 27 viajes', 'Asia 5 viajes', 'América 5 viajes', 'África 2 viajes']) {
    await expect(page.getByRole('button', { name, exact: true })).toBeDisabled()
  }
  await expect(page.locator('#library-pending')).toBeVisible()
  await expect(page.locator('#library-counts')).toContainText('provisionales')
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
