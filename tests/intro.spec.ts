import { expect, test } from '@playwright/test'

test('reproduce el vídeo y revela logo, textos y botón antes de navegar', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const video = page.locator('video')
  const intro = page.locator('.intro')
  const button = page.getByRole('button', { name: 'Subir a bordo', includeHidden: true })

  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.5)
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  await expect(button).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'El mundo, a tu manera.' })).toHaveCount(0)

  await expect(intro).toHaveAttribute('data-revealed', 'true', { timeout: 15_000 })
  const revealAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  expect(revealAt).toBeGreaterThanOrEqual(7.4)
  expect(revealAt).toBeLessThan(9.5)
  await expect(button).toBeDisabled()
  await expect(page.locator('.brand__descriptor')).toHaveCSS('opacity', '0')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: testInfo.outputPath('logo-escribiendose.png') })

  await expect.poll(() => page.locator('.brand__descriptor').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.8)
  await expect(button).toBeDisabled()
  await expect(button).toBeEnabled()
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.ended)).toBe(true)
  await expect(page.locator('.intro__action')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('portada-mobile.png'), fullPage: true })

  await button.click()
  const nextHeading = page.getByRole('heading', { name: '¿Dónde empieza tu próximo viaje?' })
  await expect(nextHeading).toBeFocused()
  await page.getByRole('button', { name: 'Volver a la portada' }).click()
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(3)
  await page.reload()
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  expect(errors).toEqual([])
})

test('un fallo del vídeo ofrece una portada estática y navegable', async ({ page }) => {
  await page.goto('/')
  // Native WebKit media requests can bypass Playwright routing. An invalid
  // media payload exercises the browser's real decoder error in both engines.
  await page.locator('video').evaluate((video: HTMLVideoElement) => {
    video.src = 'data:video/mp4;base64,AAAA'
    video.load()
  })
  await expect(page.locator('.intro')).toHaveAttribute('data-immediate', 'true')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('.intro__film')).toHaveAttribute('src', '/media/portada-final.webp')
  await page.getByRole('button', { name: 'Subir a bordo' }).click()
  await expect(page.getByRole('heading', { name: '¿Dónde empieza tu próximo viaje?' })).toBeVisible()
})

test('permite continuar si el navegador bloquea la reproducción automática', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.pause()
      this.removeAttribute('autoplay')
      return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'))
    }
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Reproducir introducción' })).toBeVisible()
  await page.getByRole('button', { name: 'Ir a la portada' }).click()
  await expect(page.getByRole('button', { name: 'Subir a bordo' })).toBeEnabled()
})

test('movimiento reducido evita el vídeo y conserva la composición y el foco', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const videoRequests: string[] = []
  page.on('request', (request) => { if (request.url().endsWith('.mp4')) videoRequests.push(request.url()) })
  await page.goto('/')
  await expect(page.locator('video')).toHaveCount(0)
  await expect(page.locator('.intro__action')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Subir a bordo' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: '¿Dónde empieza tu próximo viaje?' })).toBeFocused()
  expect(videoRequests).toEqual([])
})

test('la portada cabe en móvil pequeño, referencia, horizontal y escritorio', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 941, height: 1672 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.evaluate(() => document.fonts.ready)
    const button = page.getByRole('button', { name: 'Subir a bordo' })
    await expect(button).toBeInViewport({ ratio: .99 })
    const bounds = await button.boundingBox()
    expect(bounds!.height).toBeGreaterThanOrEqual(44)
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }))
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width)
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1)
    await page.screenshot({ path: testInfo.outputPath(`portada-${viewport.width}x${viewport.height}.png`), fullPage: true })
  }
})
