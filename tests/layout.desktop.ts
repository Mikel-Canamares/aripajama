import { expect, test, type Page } from '@playwright/test'
import { openIntroWithMediaError } from './intro-helpers'

test.use({ reducedMotion: 'reduce', viewport: { width: 1366, height: 768 } })
test.describe.configure({ timeout: 90_000 })

async function enterHub(page: Page) {
  await openIntroWithMediaError(page)
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.locator('.journey__title')).toBeFocused()
}

test('muestra el tríptico completo y cambia de composición en 1024 px', async ({ page }) => {
  const requests = new Set<string>()
  page.on('request', request => requests.add(new URL(request.url()).pathname))
  await enterHub(page)
  for (const [width, height] of [[1366, 768], [1024, 768], [1440, 900], [1920, 1080]]) {
    await page.setViewportSize({ width, height })
    const cards = page.locator('.journey__card')
    const first = (await cards.first().boundingBox())!
    for (const [index, card] of (await cards.all()).entries()) {
      const box = (await card.boundingBox())!
      expect(box.y).toBeCloseTo(first.y, 0)
      expect(box.width).toBeCloseTo(first.width, 0)
      expect(box.height).toBeCloseTo(first.height, 0)
      expect(box.x).toBeGreaterThanOrEqual(first.x + index * first.width - 1)
      expect(box.y + box.height).toBeLessThan(height)
      await expect(card.locator('.journey__scene')).toBeVisible()
      await expect(card.getByRole('button')).toBeInViewport({ ratio: .99 })
    }
    await expect(page.locator('.journey__title')).toBeInViewport({ ratio: .99 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  expect(requests.has('/media/hub-clean.webp')).toBe(false)
  await page.setViewportSize({ width: 1023, height: 768 })
  await expect(page.locator('.journey__scene').first()).toBeHidden()
  await expect.poll(() => requests.has('/media/hub-clean.webp')).toBe(true)
})

test('mantiene las tres entradas con arte fallido, teclado y texto al 200 %', async ({ page }) => {
  await page.route('**/media/about/footer-ribbons.webp', route => route.abort())
  await page.route('**/media/trips/vietnam/ruta.webp', route => route.abort())
  await enterHub(page)
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'error')
  await page.addStyleTag({ content: 'html { font-size: 200% }' })
  for (const card of await page.locator('.journey__card').all()) {
    await page.keyboard.press('Tab')
    await expect(card.getByRole('button')).toBeFocused()
    await expect(card.getByRole('button')).toHaveCSS('outline-style', 'solid')
    expect(await card.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
  }
  await page.keyboard.press('Enter')
  await expect(page.locator('.create-trip h1')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Crear mi viaje', exact: true })).toBeFocused()
})

test('recorre las secciones, conserva el borrador y vuelve al hub desde la firma', async ({ page }) => {
  await enterHub(page)
  await page.getByRole('button', { name: 'Quién soy', exact: true }).click()
  const nav = page.getByRole('navigation', { name: 'Navegación principal' })
  await expect(nav.getByRole('link', { name: 'Quién soy' })).toHaveAttribute('aria-current', 'page')
  const copy = (await page.locator('.about__copy').first().boundingBox())!
  const portrait = page.locator('.about__photo--portrait')
  await expect(portrait).toBeInViewport({ ratio: .99 })
  expect((await portrait.boundingBox())!.x).toBeGreaterThan(copy.x + copy.width)
  await nav.getByRole('link', { name: 'Crear mi viaje' }).click()
  const discover = page.locator('#create-trip-discover')
  await expect(discover).toBeInViewport({ ratio: .99 })
  await discover.click()
  await expect(page.locator('.questionnaire h1')).toBeFocused()
  const heading = (await page.locator('.questionnaire__heading').boundingBox())!
  expect((await page.locator('#question-options').boundingBox())!.x).toBeGreaterThan(heading.x + heading.width)
  await page.getByRole('checkbox').first().check()
  await nav.getByRole('link', { name: 'Biblioteca de viajes' }).click()
  await expect(page.locator('.library h1')).toBeFocused()
  await page.goBack()
  await expect(page.getByRole('checkbox').first()).toBeChecked()
  await page.getByRole('button', { name: 'Aripajama, volver al hub' }).click()
  await expect(page.getByRole('button', { name: 'Crear mi viaje', exact: true })).toBeFocused()
  await expect(nav).toHaveCount(0)
  await page.getByRole('button', { name: 'Biblioteca de viajes', exact: true }).click()
  await page.locator('#library-countries').click()
  await page.locator('#country-TH').click()
  await page.locator('#trip-tailandia').click()
  await page.locator('.trip-route__enlarge').click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Ampliar' }).click()
  await expect(dialog.locator('.trip-viewer__viewport')).toHaveAttribute('data-zoomed', 'true')
  await page.keyboard.press('Escape')
  await expect(page.locator('.trip-route__enlarge')).toBeFocused()
  await nav.getByRole('link', { name: 'Biblioteca de viajes' }).click()
  await expect(page.locator('.library')).toHaveAttribute('data-view', 'home')
})
