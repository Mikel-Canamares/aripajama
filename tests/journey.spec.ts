import { expect, test } from '@playwright/test'

test('entra con fundido y muestra la pantalla del hub', async ({ page }, testInfo) => {
  await page.goto('/')
  const video = page.locator('.intro video')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => Number.isFinite(element.duration))).toBe(true)
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .1 })
  await expect(page.getByRole('button', { name: 'Comencemos' })).toBeEnabled()
  await page.getByRole('button', { name: 'Comencemos' }).click()
  const nextHeading = page.getByRole('heading', { name: 'Tu viaje, en tres formas' })
  await expect(nextHeading).toBeFocused()
  await page.screenshot({ path: testInfo.outputPath('hub.png') })
  for (const card of await page.locator('.journey__card').all()) {
    await expect(card).toHaveCSS('opacity', '1')
  }
  await page.getByRole('button', { name: 'Volver a la portada' }).click()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
  await expect(page.locator('.journey')).toHaveCount(0)
})

test('el hub respeta movimiento reducido y cabe en todos los encuadres', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const videoRequests: string[] = []
  page.on('request', (request) => { if (request.url().endsWith('.mp4')) videoRequests.push(request.url()) })
  for (const viewport of [
    { width: 280, height: 568 },
    { width: 320, height: 568 },
    { width: 384, height: 915 },
    { width: 390, height: 844 },
    { width: 941, height: 1672 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: 'Comencemos' }).click()
    await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
    await expect(page.locator('video')).toHaveCount(0)
    await expect(page.locator('.journey__header')).toBeInViewport({ ratio: .99 })
    // Hidden subtitle is present in the DOM for screen readers
    await expect(page.locator('.journey__subtitle')).toHaveText(/Conóceme, inspírate y empieza\s*a crear tu próxima historia\./)
    // Card arrows are decorative spans (not interactive elements)
    await expect(page.locator('.journey__cards a, .journey__cards button, .journey__cards [tabindex]')).toHaveCount(0)
    const header = (await page.locator('.journey__header').boundingBox())!
    let previousTop = header.y + header.height
    for (const name of ['Quién soy', 'Biblioteca de viajes', 'Crear mi viaje']) {
      const heading = page.getByRole('heading', { name, exact: true })
      await expect(heading).toBeInViewport({ ratio: .99 })
      const box = (await heading.boundingBox())!
      expect(box.y).toBeGreaterThan(previousTop)
      previousTop = box.y
    }
    const back = page.getByRole('button', { name: 'Volver a la portada' })
    await expect(back).toBeInViewport({ ratio: .99 })
    expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }))
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width)
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1)
    await page.screenshot({ path: testInfo.outputPath(`hub-${viewport.width}x${viewport.height}.png`), fullPage: true })
  }
  // The hub no longer loads any video; only the intro video may have been requested.
  const hubVideoRequests = videoRequests.filter(url => url.includes('hub'))
  expect(hubVideoRequests).toEqual([])
})
