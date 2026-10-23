import { expect, test } from '@playwright/test'
import { readLibraryView, TRIPS } from '../src/data/library'
import { TRIP_DETAILS } from '../src/data/trip-details'

const detailUrl = '/#biblioteca/viajes/tailandia'

test('registro de detalle y rutas: solo se habilitan viajes con contenido', () => {
  const detail = TRIP_DETAILS.tailandia!
  expect(readLibraryView('#biblioteca/viajes/tailandia')).toEqual({ page: 'detail', tripId: 'tailandia' })
  for (const hash of ['#biblioteca/viajes/japon', '#biblioteca/viajes/desconocido', '#biblioteca/viajes/tailandia?pais=TH', '#biblioteca/viajes/tailandia?', '#biblioteca/viajes/tailandia/extra']) expect(readLibraryView(hash)).toEqual({ page: 'invalid' })
  for (const id of Object.keys(TRIP_DETAILS)) expect(TRIPS.some(trip => trip.id === id)).toBe(true)
  expect(detail.stages.map(stage => [stage.destination, stage.days])).toEqual([
    ['Bangkok', 'Días 1–3'], ['Ayutthaya', 'Día 4'], ['Chiang Rai', 'Días 5–6'], ['Chiang Mai', 'Días 7–9'], ['Krabi', 'Días 10–11'], ['Koh Phangan', 'Días 12–14 · 3 noches'], ['Bangkok', 'Día 15'],
  ])
  expect(new Set(detail.stages.map(stage => stage.destination)).size).toBe(6)
  expect(detail.sheets.map(sheet => sheet.title)).toEqual(['Portada', 'La ruta', 'El viaje', 'Lo que me llevo'])
})

for (const origin of ['#biblioteca/viajes', '#biblioteca/viajes?pais=TH', '#biblioteca/viajes?continente=asia']) {
  test(`abre desde ${origin} y restaura lista, filtros, foco y scroll`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/${origin}`)
    const link = page.getByRole('link', { name: 'Descubrir Tailandia, 15 días' })
    await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
    await link.scrollIntoViewIfNeeded()
    const position = await page.evaluate(() => window.scrollY)
    await link.click()
    await expect(page).toHaveURL(detailUrl)
    await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
    await expect(page.locator('.trip-stage')).toHaveCount(7)
    await expect(page.locator('.trip-facts')).toHaveText('15 días6 destinos7 etapas')
    await page.getByRole('button', { name: 'Volver', exact: true }).click()
    await expect(page).toHaveURL(`/${origin}`)
    await expect(link).toBeFocused()
    expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(position, 0)
    await page.goForward()
    await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  })
}

test('entrada directa y navegación por secciones sin entradas adicionales de historial', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(detailUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  const length = await page.evaluate(() => history.length)
  for (const [button, id] of [['Ruta', 'ruta'], ['Etapas', 'etapas'], ['Esencia', 'esencia'], ['Inicio', 'inicio']]) {
    await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: button, exact: true }).click()
    await expect(page.locator(`#trip-${id}`)).toBeFocused()
    const index = (await page.locator('.trip-index').boundingBox())!
    const heading = (await page.locator(`#trip-${id}`).boundingBox())!
    expect(heading.y).toBeGreaterThanOrEqual(index.y + index.height - 1)
    expect(await page.evaluate(() => history.length)).toBe(length)
    await expect(page).toHaveURL(detailUrl)
  }
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/#biblioteca/viajes')
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca de viajes' })).toBeFocused()
})

test('originales bajo demanda, zoom, teclado, foco y regreso sin perder posición', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const originals: string[] = []
  page.on('request', request => { if (request.url().includes('/originals/')) originals.push(request.url()) })
  await page.goto('/#biblioteca/viajes')
  await page.getByRole('link', { name: 'Descubrir Tailandia, 15 días' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  expect(originals).toHaveLength(0)
  const opener = page.getByRole('button', { name: 'Ver las láminas originales' })
  await opener.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'Portada', exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Cerrar visor' })).toBeFocused()
  await expect.poll(() => originals.length).toBe(1)
  await expect(dialog.getByRole('button', { name: 'Lámina anterior' })).toBeDisabled()
  await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
  const fits = await dialog.locator('img').evaluate(image => image.clientHeight <= image.parentElement!.clientHeight && image.clientWidth <= image.parentElement!.clientWidth)
  expect(fits).toBe(true)
  await dialog.getByRole('button', { name: 'Ampliar', exact: true }).click()
  await expect(dialog.getByRole('button', { name: 'Ajustar', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.locator('.trip-viewer__viewport')).toHaveAttribute('data-zoomed', 'true')
  await dialog.getByRole('button', { name: 'Ajustar', exact: true }).click()
  await page.keyboard.press('ArrowRight')
  await expect(dialog.getByRole('heading', { name: 'La ruta', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Lámina siguiente' }).click()
  await expect(dialog.getByRole('heading', { name: 'El viaje', exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Lámina siguiente' }).click()
  await expect(dialog.getByRole('button', { name: 'Lámina siguiente' })).toBeDisabled()
  await expect(dialog.getByRole('heading', { name: 'Lo que me llevo', exact: true })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(opener).toBeFocused()
  await expect(page).toHaveURL(detailUrl)
  await page.getByRole('button', { name: 'Ampliar el mapa de la ruta' }).click()
  const position = await page.evaluate(() => window.scrollY)
  await expect(dialog.getByRole('heading', { name: 'La ruta', exact: true })).toBeVisible()
  // Tab remains in the native modal dialog.
  for (let index = 0; index < 8; index++) {
    await page.keyboard.press('Tab')
    expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true)
  }
  await dialog.getByRole('button', { name: 'Cerrar visor' }).click()
  await expect(page.getByRole('button', { name: 'Ampliar el mapa de la ruta' })).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(position, 0)
})

test('imágenes ausentes: permanecen el contenido, el visor y la navegación', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/media/trips/**', route => route.abort())
  await page.goto(detailUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  await expect(page.locator('.trip-stage')).toHaveCount(7)
  await expect(page.locator('.trip-photo--missing').first()).toBeVisible()
  await page.getByRole('button', { name: 'Ver las láminas originales' }).click()
  await expect(page.getByRole('dialog').getByRole('status')).toContainText('No se ha podido cargar')
  await page.keyboard.press('Escape')
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL('/#biblioteca/viajes')
})

test('transiciones y movimiento normal conservan el foco', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#biblioteca/viajes?continente=asia')
  await expect(page.getByRole('heading', { level: 1, name: 'Asia', exact: true })).toBeFocused()
  await page.getByRole('link', { name: 'Descubrir Tailandia, 15 días' }).click()
  await expect(page.locator('.library__view')).toHaveAttribute('inert', '')
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('link', { name: 'Descubrir Tailandia, 15 días' })).toBeFocused()
})

test('encuadres responsive, controles táctiles y texto al 200 %', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 280, height: 568 }, { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    await page.goto(detailUrl)
    await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
    await page.evaluate(() => document.fonts.ready)
    for (const section of ['Ruta', 'Etapas', 'Esencia', 'Inicio']) {
      await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name: section, exact: true }).click()
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    }
    for (const button of await page.locator('.trip-detail button').all()) expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    for (const element of await page.locator('.trip-stage, .trip-hero__copy, .trip-theme, .trip-index button').all()) expect(await element.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`trip-${viewport.width}.png`), fullPage: true })
    await page.getByRole('button', { name: 'Ver las láminas originales' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`viewer-${viewport.width}.png`) })
    await page.keyboard.press('Escape')
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(detailUrl)
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  await page.getByRole('button', { name: 'Etapas', exact: true }).click()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  for (const element of await page.locator('.trip-stage, .trip-index button').all()) expect(await element.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('trip-text-200.png') })
})
