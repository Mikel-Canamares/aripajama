import { expect, test, type Page } from '@playwright/test'
import { openIntroWithMediaError } from './intro-helpers'

const title = (page: Page) => page.locator('.about h1')
const hubButton = (page: Page) => page.getByRole('button', { name: 'Quién soy', exact: true })
const backButton = (page: Page) => page.getByRole('button', { name: 'Volver', exact: true })

async function openHub(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openIntroWithMediaError(page)
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.locator('.journey__title')).toBeFocused()
}

test('entra por teclado y restaura el foco con Volver, Escape e historial', async ({ page }) => {
  await openHub(page)
  await page.keyboard.press('Tab')
  await expect(hubButton(page)).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(title(page)).toBeFocused()
  await expect(page).toHaveURL(/#quien-soy$/)
  await page.keyboard.press('Shift+Tab')
  await expect(backButton(page)).toBeFocused()
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

test('admite enlace directo, recarga y regreso local sin reproducir la portada', async ({ page }) => {
  const videos: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) videos.push(request.url()) })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#quien-soy')
  await expect(title(page)).toBeFocused()
  await page.reload()
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.intro')).toHaveCount(0)
  await backButton(page).click()
  await expect(hubButton(page)).toBeFocused()
  await expect(page).not.toHaveURL(/#quien-soy/)
  expect(videos).toEqual([])
})

test('conserva la composición vertical de la referencia, con ilustración, medallones y cintas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.setViewportSize({ width: 941, height: 1672 })
  await page.goto('/#quien-soy')
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.about button')).toHaveCount(1)
  await expect(backButton(page)).toBeVisible()
  await expect(page.locator('.about nav, .about__menu')).toHaveCount(0)
  await expect(page.locator('.about__header-art')).toBeInViewport()
  await expect.poll(() => page.locator('.about__header-art').evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0)
  await expect(page.locator('.about__number').first()).toHaveCSS('background-image', /number-peach/)
  await expect(page.locator('.about__section--photography .about__number')).toHaveCSS('background-image', /number-blue/)
  await expect(page.locator('.about__copy h1')).toHaveCSS('color', 'rgb(8, 7, 6)')
  await expect(page.locator('.about__rule')).toHaveCount(4)
  for (const section of ['ariana', 'origin', 'photography', 'travel']) {
    const copy = (await page.locator(`.about__section--${section} .about__copy`).boundingBox())!
    const art = (await page.locator(`.about__section--${section} > div`).last().boundingBox())!
    expect(art.y).toBeGreaterThanOrEqual(copy.y + copy.height - 1)
  }
  await expect(page.locator('.about__footer-ribbons')).toHaveAttribute('src', '/media/about/footer-ribbons.webp')
})

test('comparte transiciones y apariciones; el regreso desde scroll conserva la salida', async ({ page }) => {
  await openHub(page)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await hubButton(page).click()
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'entering')
  await expect(page.locator('.navigation__about')).toHaveCSS('animation-name', 'library-arrive')
  await expect(page.locator('.navigation__about')).toHaveAttribute('inert', '')
  await expect(page.locator('.navigation__hub')).toHaveAttribute('inert', '')
  await expect(title(page)).toBeFocused()
  await expect(title(page)).toHaveAttribute('data-reveal-state', /running|shown/)
  await page.locator('.about__closing').scrollIntoViewIfNeeded()
  const scroll = await page.evaluate(() => window.scrollY)
  expect(scroll).toBeGreaterThan(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('.navigation')).toHaveAttribute('data-navigation', 'returning')
  await expect(page.locator('.navigation__about')).toHaveCSS('top', `${-scroll}px`)
  await expect(hubButton(page)).toBeFocused()
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('conserva los textos y los quince marcos blancos sin cargar fotografías', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#quien-soy')
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.about__section')).toHaveCount(4)
  await expect(page.locator('.about__number')).toHaveText(['01', '02', '03', '04'])
  await expect(page.locator('.about__photo')).toHaveCount(15)
  await expect(page.locator('.about__photo img')).toHaveCount(0)
  for (const frame of await page.locator('.about__photo').all()) {
    await expect(frame).toHaveCSS('background-color', 'rgb(255, 255, 255)')
    await expect(frame).toHaveAttribute('aria-hidden', 'true')
  }
  await expect(page.locator('.about__section--origin')).toContainText('Hoy su letra forma parte de Aripajama')
  await expect(page.locator('.about__section--photography')).toContainText('No solo fotografío lugares, también personas')
  await expect(page.locator('.about__section--travel')).toContainText('ayudarte a crear viajes únicos, a tu manera.')
  await expect(page.locator('.about__closing p')).toHaveText('Hoy viajo de la misma maneraque soñé.')
  expect(await page.locator('.about img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
})

test('los fallos decorativos y el movimiento reducido mantienen la navegación disponible', async ({ page }) => {
  await page.route('**/media/about/**', route => route.abort())
  await openHub(page)
  await hubButton(page).click()
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.navigation__about')).toHaveCSS('animation-name', 'none')
  await expect(page.locator('.about__copy p').first()).toHaveCSS('opacity', '1')
  await expect(page.locator('.about__header-art')).toHaveCSS('visibility', 'hidden')
  await expect(backButton(page)).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(hubButton(page)).toBeFocused()
})

test('se adapta de 280 a 1440 px, con controles táctiles y sin desbordamientos', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#quien-soy')
  for (const viewport of [
    { width: 280, height: 568 }, { width: 320, height: 568 }, { width: 390, height: 844 },
    { width: 451, height: 900 }, { width: 768, height: 1024 }, { width: 941, height: 1672 },
    { width: 844, height: 390 }, { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.reload()
    await expect(title(page)).toBeFocused()
    await page.evaluate(() => document.fonts.ready)
    await expect.poll(() => page.locator('.about img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete))).toBe(true)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const overflow = await page.locator('.about h1, .about h2, .about p').evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent))
    expect(overflow).toEqual([])
    for (const control of await page.locator('.about button').all()) {
      const box = (await control.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(44)
      expect(box.height).toBeGreaterThanOrEqual(44)
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
    }
    await title(page).focus()
    await page.screenshot({ path: testInfo.outputPath(`about-${viewport.width}x${viewport.height}.png`), fullPage: true })
  }
})

test('mantiene la lectura y Volver con texto al 200 %', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#quien-soy')
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    await page.reload()
    await expect(title(page)).toBeFocused()
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    const overflow = await page.locator('.about h1, .about h2, .about p').evaluateAll(elements => elements.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent))
    expect(overflow).toEqual([])
    await expect(backButton(page)).toBeInViewport()
    await expect(page.locator('.about button')).toHaveCount(1)
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: testInfo.outputPath(`about-text-200-${width}.png`), fullPage: true })
  }
})
