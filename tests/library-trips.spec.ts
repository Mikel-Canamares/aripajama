import { expect, test } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import sharp from 'sharp'
import { TRIPS, readLibraryView } from '../src/data/library'
import { TRIP_DETAILS } from '../src/data/trip-details'

// Independent editorial inventory: [duration on cover, itinerary cards].
const inventory: Record<string, [number, number]> = {
  galicia: [9,6], asturias: [8,8], cantabria: [10,10], navarra: [6,6],
  'pirineo-aragones': [5,6], ordesa: [8,8], bilbao: [7,6], menorca: [7,7],
  'la-palma': [7,7], 'toulouse-carcasona': [3,3], paris: [4,4], londres: [4,4],
  escocia: [13,11], berlin: [5,5], 'austria-tirol-baviera': [9,5], amsterdam: [4,4],
  belgica: [6,5], budapest: [4,4], 'cracovia-navidad': [5,5], 'atenas-santorini': [7,7],
  'croacia-venecia': [15,13], roma: [5,5], 'milan-verona': [3,3],
  'toscana-cinque-terre': [7,7], oporto: [3,3], 'suiza-navidad': [5,5],
  islandia: [12,9], japon: [18,7], tailandia: [15,7], vietnam: [17,7],
  filipinas: [18,6], 'malasia-singapur': [15,7], peru: [18,13], colombia: [18,6],
  'estados-unidos-este': [12,3], 'estados-unidos-oeste': [22,9],
  'riviera-maya': [9,8], marruecos: [10,7], tunez: [8,5],
}

test('los 39 viajes coinciden con el inventario editorial y todos sus recursos se decodifican', async () => {
  expect(Object.keys(TRIP_DETAILS).sort()).toEqual(Object.keys(inventory).sort())
  for (const trip of TRIPS) {
    const detail = TRIP_DETAILS[trip.id]!
    expect([trip.days, detail.stages.length], trip.id).toEqual(inventory[trip.id])
    expect(readLibraryView(`#biblioteca/viajes/${trip.id}`)).toEqual({ page: 'detail', tripId: trip.id })
    const images = [detail.cover, detail.map, detail.closingImage, ...detail.stages.map(stage => stage.image)]
    for (const image of images) {
      const buffer = await readFile(resolve(`public${image.src}`))
      const metadata = await sharp(buffer).metadata()
      expect([metadata.width, metadata.height], image.src).toEqual([image.width, image.height])
      expect(metadata.format).toBe('webp')
      expect(image.alt.trim().length).toBeGreaterThan(10)
      await sharp(buffer).raw().toBuffer()
    }
    expect(detail.sheets.length).toBeGreaterThanOrEqual(3)
    for (const sheet of detail.sheets) {
      const metadata = await sharp(await readFile(resolve(`public${sheet.src}`))).metadata()
      expect(metadata.format).toBe('png')
      expect(metadata.width).toBeGreaterThan(800)
      if (sheet.width) expect([metadata.width, metadata.height]).toEqual([sheet.width, sheet.height])
    }
    const routeSheet = detail.sheets[detail.routeSheetIndex ?? 1]
    expect(routeSheet.title).toBe('La ruta')
  }
  expect(TRIP_DETAILS['cracovia-navidad']!.stages[1].description).toContain('Santa María y la Barbacana')
  expect(TRIP_DETAILS['pirineo-aragones']!.stages.at(-1)).toMatchObject({ days: 'Si queda tiempo', optional: true })
  expect(TRIP_DETAILS.amsterdam!.themes).toHaveLength(4)
})

for (const trip of TRIPS) {
  test(`${trip.id}: abre desde su continente, carga contenido y visor y restaura el enlace`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const errors: string[] = []
    const originals: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    page.on('request', request => { if (request.url().includes('/originals/')) originals.push(request.url()) })
    const origin = `/#biblioteca/viajes?continente=${trip.continent}`
    await page.goto(origin)
    const link = page.locator(`#trip-${trip.id}`)
    await link.click()
    await expect(page).toHaveURL(`/#biblioteca/viajes/${trip.id}`)
    await expect(page.getByRole('heading', { level: 1, name: trip.title, exact: true })).toBeFocused()
    if (trip.subtitle) await expect(page.locator('.trip-hero__subtitle')).toHaveText(trip.subtitle)
    await expect(page.locator('.trip-stage')).toHaveCount(inventory[trip.id][1])
    expect(originals).toHaveLength(0)
    await page.locator('.trip-detail img').evaluateAll(images => images.forEach(image => (image as HTMLImageElement).loading = 'eager'))
    await expect.poll(() => page.locator('.trip-detail img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
    await expect(page.locator('.trip-photo--missing')).toHaveCount(0)
    const route = page.getByRole('button', { name: 'Ampliar el mapa de la ruta', exact: true })
    await route.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'La ruta', exact: true })).toBeVisible()
    await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
    await page.keyboard.press('Escape')
    await expect(route).toBeFocused()
    await page.getByRole('button', { name: 'Volver', exact: true }).click()
    await expect(page).toHaveURL(origin)
    await expect(link).toBeFocused()
    await page.goForward()
    await expect(page.getByRole('heading', { level: 1, name: trip.title, exact: true })).toBeFocused()
    await page.reload()
    await expect(page.getByRole('heading', { level: 1, name: trip.title, exact: true })).toBeFocused()
    expect(errors).toEqual([])
  })
}

for (const id of ['cracovia-navidad', 'peru', 'amsterdam', 'estados-unidos-este', 'cantabria', 'la-palma']) {
  test(`${id}: encuadres, texto largo y láminas con proporciones diferentes`, async ({ page }, testInfo) => {
    test.slow()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    for (const viewport of [{ width: 280, height: 568 }, { width: 390, height: 844 }, { width: 844, height: 390 }, { width: 1440, height: 900 }]) {
      await page.setViewportSize(viewport)
      await page.goto(`/#biblioteca/viajes/${id}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      await page.evaluate(() => document.fonts.ready)
      for (const name of ['Etapas', 'Esencia', 'Inicio']) {
        await page.getByRole('navigation', { name: 'Secciones del viaje' }).getByRole('button', { name, exact: true }).click()
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      }
      for (const element of await page.locator('.trip-stage, .trip-hero__copy, .trip-theme').all()) expect(await element.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      if (viewport.width === 390 || viewport.width === 1440) {
        // Capture the whole article with photos decoded, at the natural top;
        // otherwise lazy images and the sticky index distort full-page shots.
        await page.locator('.trip-detail img').evaluateAll(images => images.forEach(image => (image as HTMLImageElement).loading = 'eager'))
        await expect.poll(() => page.locator('.trip-detail img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
        await page.evaluate(() => window.scrollTo(0, 0))
        await page.screenshot({ path: testInfo.outputPath(`${id}-${viewport.width}.png`), fullPage: true })
      }
      await page.getByRole('button', { name: 'Ver las láminas originales' }).click()
      const dialog = page.getByRole('dialog')
      // The first sheet is a route when there is no supplied cover.
      await expect(dialog.getByRole('heading', { name: id === 'estados-unidos-este' ? 'La ruta' : 'Portada', exact: true })).toBeVisible()
      const itineraryIndex = TRIP_DETAILS[id]!.sheets.findIndex(sheet => sheet.title === 'El viaje')
      for (let index = 0; index < itineraryIndex; index++) await dialog.getByRole('button', { name: 'Lámina siguiente' }).click()
      await expect.poll(() => dialog.locator('img').evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true)
      expect(await dialog.locator('img').evaluate(image => image.clientHeight <= image.parentElement!.clientHeight + 1 && image.clientWidth <= image.parentElement!.clientWidth + 1)).toBe(true)
      await page.keyboard.press('Escape')
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    await page.getByRole('button', { name: 'Etapas', exact: true }).click()
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  })
}
