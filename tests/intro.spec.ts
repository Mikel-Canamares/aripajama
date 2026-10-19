import { expect, test } from '@playwright/test'

test('revela la composición y permite navegar mientras se reproduce el vídeo', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const video = page.locator('.intro video')
  const intro = page.locator('.intro')
  const button = page.getByRole('button', { name: 'Subir a bordo', includeHidden: true })

  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { intervals: [50] }).toBeGreaterThan(.1)
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  await expect(button).toBeDisabled()
  await expect(page.getByRole('heading', { name: 'El mundo, a tu manera.' })).toHaveCount(0)

  await expect(intro).toHaveAttribute('data-revealed', 'true')
  const revealAt = await video.evaluate((element: HTMLVideoElement) => element.currentTime)
  expect(revealAt).toBeGreaterThanOrEqual(1)
  expect(revealAt).toBeLessThan(2)
  await expect(button).toBeDisabled()
  await expect(page.locator('.brand__descriptor')).toHaveCSS('opacity', '0')
  await page.waitForTimeout(1400)
  await page.screenshot({ path: testInfo.outputPath('logo-escribiendose.png') })

  await expect.poll(() => page.locator('.brand__descriptor').evaluate((el) => Number(getComputedStyle(el).opacity))).toBeGreaterThan(.8)
  await expect(button).toBeDisabled()
  await expect(button).toBeEnabled()
  const readyAt = await video.evaluate((element: HTMLVideoElement) => ({
    time: element.currentTime,
    ended: element.ended,
    paused: element.paused,
  }))
  expect(readyAt.time).toBeGreaterThanOrEqual(8)
  expect(readyAt.time).toBeLessThan(9.5)
  expect(readyAt.ended).toBe(false)
  expect(readyAt.paused).toBe(false)
  await expect(page.locator('.brand__finish')).toHaveCSS('opacity', '1')
  for (const item of await page.locator('.reveal-item').all()) {
    await expect(item).toHaveCSS('opacity', '1')
  }
  await expect(page.locator('.intro__action')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('portada-mobile.png'), fullPage: true })

  await button.click()
  const nextHeading = page.getByRole('heading', { name: 'Tu viaje, en tres formas' })
  await expect(nextHeading).toBeFocused()
  await page.getByRole('button', { name: 'Volver a la portada' }).click()
  // Check the reset during the return fade, before the reveal starts at 1 s.
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(3)
  await page.reload()
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  expect(errors).toEqual([])
})

test('al terminar el vídeo completa la composición aunque la animación siga pendiente', async ({ page }) => {
  await page.goto('/')
  const video = page.locator('video')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => Number.isFinite(element.duration)), { intervals: [50] }).toBe(true)
  await expect(page.getByRole('button', { name: 'Subir a bordo', includeHidden: true })).toBeDisabled()
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .1 })
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.ended)).toBe(true)
  await expect(page.locator('.intro')).toHaveAttribute('data-immediate', 'true')
  await expect(page.locator('.brand__stroke').first()).toHaveCSS('stroke-dashoffset', '0px')
  await expect(page.locator('.brand__finish')).toHaveCSS('opacity', '1')
  for (const item of await page.locator('.reveal-item').all()) {
    await expect(item).toHaveCSS('opacity', '1')
  }
  await page.getByRole('button', { name: 'Subir a bordo' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
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
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeVisible()
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
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
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
