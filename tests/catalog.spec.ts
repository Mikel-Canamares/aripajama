import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import { CONTINENTS, COUNTRIES, TRIPS, illustratedIcon, readLibraryView, selectTrips } from '../src/data/library'
import { COUNTRY_ART, COMPOSITE_ART, REGIONAL_ART } from '../src/data/library-icons'

test('catálogo íntegro: países, viajes, relaciones y contadores sin duplicados', () => {
  expect(COUNTRIES).toHaveLength(27)
  expect(TRIPS).toHaveLength(39)
  expect(new Set(COUNTRIES.map(country => country.code)).size).toBe(COUNTRIES.length)
  expect(new Set(TRIPS.map(trip => trip.id)).size).toBe(TRIPS.length)
  expect(new Set(TRIPS.map(trip => trip.order)).size).toBe(TRIPS.length)
  expect(COUNTRIES.map(country => country.name)).toEqual(COUNTRIES.map(country => country.name).sort((a, b) => a.localeCompare(b, 'es')))
  for (const trip of TRIPS) {
    expect(trip.countries.length).toBeGreaterThan(0)
    expect([...Object.keys(COUNTRY_ART), ...Object.keys(REGIONAL_ART), ...Object.keys(COMPOSITE_ART)]).toContain(trip.icon)
    for (const code of trip.countries) {
      const country = COUNTRIES.find(item => item.code === code)
      expect(country).toBeDefined()
      expect(country!.continent).toBe(trip.continent)
    }
  }
  for (const country of COUNTRIES) {
    expect(selectTrips({ page: 'trips', country: country.code }).length).toBeGreaterThan(0)
    expect(COUNTRY_ART[country.code]).toBeDefined()
  }
  expect(CONTINENTS.map(continent => selectTrips({ page: 'trips', continent: continent.id }).length)).toEqual([27, 5, 5, 2])
  expect(selectTrips({ page: 'trips', country: 'DE' }).map(trip => trip.id)).toEqual(['berlin', 'austria-tirol-baviera'])
  expect(selectTrips({ page: 'trips', country: 'IT' }).map(trip => trip.id)).toContain('croacia-venecia')
  expect(selectTrips({ page: 'trips', country: 'SG' }).map(trip => trip.id)).toEqual(['malasia-singapur'])
  for (const hash of ['#biblioteca/viajes?pais=XX', '#biblioteca/viajes?pais=', '#biblioteca/viajes?pais=ES&pais=AT', '#biblioteca/viajes?otro=filtro']) {
    expect(readLibraryView(hash)).toEqual({ page: 'invalid' })
  }
})

test('cada ilustración es un recurso WebP transparente de alta resolución', async ({ request }) => {
  const sources = new Set([
    ...COUNTRIES.map(country => illustratedIcon(country.code, country.tone)),
    ...TRIPS.map(trip => illustratedIcon(trip.icon, trip.tone)),
  ])
  for (const source of sources) {
    const response = await request.get(source)
    expect(response.ok(), source).toBe(true)
    const image = sharp(await response.body())
    const metadata = await image.metadata()
    expect(metadata.format).toBe('webp')
    expect(metadata.width).toBe(384)
    expect(metadata.height).toBe(384)
    expect(metadata.hasAlpha).toBe(true)
    const stats = await image.stats()
    expect(stats.channels[3].min).toBe(0)
    expect(stats.channels[3].max).toBeGreaterThan(200)
  }
})

test('abre países directamente, filtra y restaura foco y scroll al volver', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#biblioteca/paises')
  await expect(page.getByRole('heading', { level: 1, name: 'Países', exact: true })).toBeFocused()
  await expect(page.locator('.catalog__total')).toHaveText('27 países')
  await expect(page.locator('.catalog__country')).toHaveCount(27)
  await expect(page.locator('video')).toHaveCount(0)
  const peru = page.getByRole('button', { name: 'Perú', exact: true })
  await peru.scrollIntoViewIfNeeded()
  const position = await page.evaluate(() => window.scrollY)
  await peru.click()
  await expect(page.getByRole('heading', { level: 1, name: 'Perú', exact: true })).toBeFocused()
  await expect(page.locator('.catalog__total')).toHaveText('1 viaje')
  await expect(page.locator('.catalog__trip')).toHaveCount(1)
  await expect(page.locator('.catalog__trip')).toContainText('18 días')
  await expect(page).toHaveURL(/pais=PE/)
  await page.keyboard.press('Escape')
  await expect(peru).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(position, 0)
  await page.goForward()
  await expect(page.getByRole('heading', { level: 1, name: 'Perú', exact: true })).toBeFocused()
  await page.reload()
  await expect(page.locator('.catalog__trip')).toHaveCount(1)
  // A reloaded direct result still has a usable parent path.
  await page.getByRole('button', { name: 'Ver todos los viajes', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca de viajes' })).toBeFocused()
  await expect(page.locator('.catalog__trip')).toHaveCount(39)
})

test('los filtros multipaís no duplican viajes ni inventan duraciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const [country, expected, title] of [['DE', 2, 'Alemania'], ['AT', 1, 'Austria'], ['IT', 4, 'Italia'], ['HR', 1, 'Croacia'], ['MY', 1, 'Malasia'], ['SG', 1, 'Singapur']] as const) {
    await page.goto(`/#biblioteca/viajes?pais=${country}`)
    await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeFocused()
    await expect(page.locator('.catalog__trip')).toHaveCount(expected)
    await expect(page.locator('.catalog__trip button, .catalog__trip a')).toHaveCount(0)
  }
  await page.goto('/#biblioteca/viajes?pais=ES')
  await expect(page.locator('.catalog__trip')).toHaveCount(9)
  await expect(page.locator('.catalog__trips')).not.toContainText('días')
})

test('filtra por continente desde la portada y elimina el filtro', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#biblioteca')
  await page.getByRole('button', { name: 'Asia 5 viajes' }).click()
  await expect(page.getByRole('heading', { name: 'Asia', level: 1, exact: true })).toBeFocused()
  await expect(page.locator('.catalog__trip')).toHaveCount(5)
  await expect(page.locator('.catalog__group')).toHaveCount(1)
  await page.getByRole('button', { name: 'Ver todos los viajes', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca de viajes' })).toBeFocused()
  await expect(page.locator('.catalog__trip')).toHaveCount(39)
  await expect(page.locator('.catalog__group')).toHaveCount(4)
  await expect(page.locator('.catalog__trip').first()).toContainText('Galicia')
  await expect(page.locator('.catalog__trip').last()).toContainText('Túnez')
  await expect(page.locator('.library__background')).toHaveAttribute('src', '/media/library/background.webp')
})

test('distingue filtros inválidos, resultados vacíos e iconos ausentes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#biblioteca/viajes?pais=XX')
  await expect(page.getByRole('heading', { level: 1, name: 'Destino no encontrado' })).toBeFocused()
  await expect(page.locator('.catalog__empty')).toContainText('no corresponde')
  await page.goto('/#biblioteca/viajes?pais=JP&continente=africa')
  await expect(page.locator('.catalog__total')).toHaveText('0 viajes')
  await expect(page.locator('.catalog__empty')).toContainText('No hay viajes')
  await page.route('**/media/library/icons/**', route => route.abort())
  await page.goto('/#biblioteca/paises')
  await expect(page.locator('.catalog__art--fallback')).toHaveCount(27)
  await page.getByRole('button', { name: 'Singapur', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Singapur', exact: true, level: 1 })).toBeFocused()
  await expect(page.locator('.catalog__trip')).toHaveCount(1)
})

test('anima solo el contenido interno sin sustituir el fondo común', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#biblioteca/paises')
  const background = await page.locator('.library__background').elementHandle()
  await page.getByRole('button', { name: 'Japón', exact: true }).click()
  await expect(page.locator('.library__view')).toHaveAttribute('data-stage', 'out')
  await expect(page.locator('.library__view')).toHaveAttribute('inert', '')
  await expect(page.getByRole('heading', { level: 1, name: 'Japón', exact: true })).toBeFocused()
  expect(await background!.evaluate(element => element === document.querySelector('.library__background'))).toBe(true)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Japón', exact: true })).toBeFocused()
})

test('los enlaces directos tienen regreso a países, biblioteca y hub sin bucles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#biblioteca/viajes?pais=SG')
  await expect(page.getByRole('heading', { name: 'Singapur', level: 1, exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Países', level: 1, exact: true })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'hub')
})

test('atrás y adelante del navegador recorren el catálogo y el hub', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await page.getByRole('button', { name: 'Países', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Países', level: 1, exact: true })).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Países', exact: true })).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Biblioteca de viajes', level: 1 })).toBeFocused()
  await page.goForward()
  await expect(page.getByRole('heading', { name: 'Países', level: 1, exact: true })).toBeFocused()
})

test('listados responsive con iconos legibles y sin desbordamiento', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 280, height: 568 }, { width: 390, height: 844 }, { width: 941, height: 1672 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    for (const view of ['paises', 'viajes']) {
      await page.goto(`/#biblioteca/${view}`)
      await expect(page.getByRole('heading', { level: 1 })).toBeFocused()
      await page.evaluate(() => document.fonts.ready)
      await expect.poll(() => page.locator('.library img').evaluateAll(images => images.every(element => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      for (const row of await page.locator('.catalog__country, .catalog__trip').all()) {
        const box = (await row.boundingBox())!
        expect(box.width).toBeGreaterThan(200)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
        expect(await row.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      }
      await page.screenshot({ path: testInfo.outputPath(`${view}-${viewport.width}.png`), fullPage: true })
    }
  }
})
