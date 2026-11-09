import { expect, test } from '@playwright/test'
import { openIntroWithMediaError } from './intro-helpers'

test.use({ reducedMotion: 'no-preference' })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    document.addEventListener('animationend', event => {
      const element = event.target
      if (!(element instanceof HTMLElement) || !element.matches('.intro__action')) return
      const video = document.querySelector<HTMLVideoElement>('.intro video')!
      element.dataset.readyAt = String(video.currentTime)
      element.dataset.videoEndedAtReady = String(video.ended)
    })
  })
})

test('revela los elementos en cascada continua y completa el botón antes del segundo 7', async ({ page }, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  const video = page.locator('.intro video')
  const intro = page.locator('.intro')
  const button = page.getByRole('button', { name: 'Comencemos', includeHidden: true })

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
  // Read the browser's animation timeline: event delivery can be throttled in WebKit.
  const sequence = await page.locator('.reveal-item').evaluateAll(elements => elements.map(element => {
    const animation = element.getAnimations()[0]
    const timing = animation.effect!.getComputedTiming()
    return {
      start: Number(animation.startTime) + Number(timing.delay),
      end: Number(animation.startTime) + Number(timing.endTime),
    }
  }))
  for (let index = 1; index < sequence.length; index++) {
    const previous = sequence[index - 1]
    const current = sequence[index]
    expect(current.start - previous.start).toBeGreaterThanOrEqual(400)
    expect(current.start - previous.start).toBeLessThanOrEqual(650)
    expect(current.start).toBeLessThan(previous.end)
    expect(current.end).toBeGreaterThan(previous.end)
  }

  await expect.poll(() => button.isEnabled(), { intervals: [50] }).toBe(true)
  const readyAt = Number(await page.locator('.intro__action').getAttribute('data-ready-at'))
  expect(readyAt).toBeGreaterThan(6)
  expect(readyAt).toBeLessThan(7)
  await expect(page.locator('.intro__action')).toHaveAttribute('data-video-ended-at-ready', 'false')
  await expect(page.locator('.brand__finish')).toHaveCSS('opacity', '1')
  for (const item of await page.locator('.reveal-item').all()) {
    await expect(item).toHaveCSS('opacity', '1')
  }
  await expect(page.locator('.intro__action')).toHaveCSS('opacity', '1')
  await page.screenshot({ path: testInfo.outputPath('portada-mobile.png'), fullPage: true })

  await button.click()
  const nextHeading = page.getByRole('heading', { name: 'Tu viaje, en tres formas' })
  await expect(nextHeading).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Quién soy', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Crear mi viaje', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Volver a la portada' })).toBeFocused()
  await page.getByRole('button', { name: 'Volver a la portada' }).click()
  // Check the reset during the return fade, before the reveal starts at 1 s.
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
  expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeLessThan(3)
  await page.reload()
  await expect(intro).toHaveAttribute('data-revealed', 'false')
  expect(errors).toEqual([])
})

test('en escritorio toda la composición está visible antes del segundo 7 y permanece al terminar el vídeo', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/')
  const video = page.locator('video')
  const button = page.getByRole('button', { name: 'Comencemos', includeHidden: true })
  await expect(button).toBeDisabled()
  await expect.poll(() => button.isEnabled(), { intervals: [50] }).toBe(true)
  const readyAt = Number(await page.locator('.intro__action').getAttribute('data-ready-at'))
  expect(readyAt).toBeGreaterThan(6)
  expect(readyAt).toBeLessThan(7)
  await expect(page.locator('.intro__action')).toHaveAttribute('data-video-ended-at-ready', 'false')
  await expect(page.locator('.intro')).toHaveAttribute('data-immediate', 'false')
  await expect(page.locator('.intro')).toHaveAttribute('data-revealed', 'true')
  await expect(page.locator('.brand__stroke').first()).toHaveCSS('stroke-dashoffset', '0px')
  await expect(page.locator('.brand__finish')).toHaveCSS('opacity', '1')
  for (const item of await page.locator('.reveal-item').all()) {
    await expect(item).toHaveCSS('opacity', '1')
  }
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.ended)).toBe(true)
  await expect(button).toBeEnabled()
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
})

test('un fallo del vídeo ofrece una portada estática y navegable', async ({ page }) => {
  await openIntroWithMediaError(page)
  await expect(page.locator('.intro')).toHaveAttribute('data-immediate', 'true')
  await expect(page.locator('video')).toHaveCount(0)
  const fallback = page.locator('img.intro__film')
  await expect(fallback).toHaveAttribute('src', '/media/portada-inicio.webp')
  await expect(fallback).toHaveJSProperty('naturalWidth', 1080)
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeVisible()
})

test('permite reproducir manualmente si el navegador bloquea el inicio automático', async ({ page }) => {
  await page.addInitScript(() => {
    let userRequestedPlayback = false
    document.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('.button--play')) userRequestedPlayback = true
    }, true)
    // Test the manual control independently of the engine's native MP4 decoder.
    document.addEventListener('error', event => {
      if (event.target instanceof HTMLMediaElement) event.stopImmediatePropagation()
    }, true)
    HTMLMediaElement.prototype.play = function () {
      if (!userRequestedPlayback) {
        this.autoplay = false
        this.pause()
        return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'))
      }
      this.dispatchEvent(new Event('playing'))
      return Promise.resolve()
    }
  })
  await page.goto('/')
  const play = page.getByRole('button', { name: 'Reproducir introducción' })
  await expect(play).toBeVisible()
  await expect(page.getByRole('button', { name: 'Comencemos', includeHidden: true })).toBeDisabled()
  await play.click()
  await expect(play).toHaveCount(0)
  await expect(page.locator('.intro video')).toHaveAttribute('src', '/media/portada.mp4')
})

test('el vídeo y la secuencia siguen activos con movimiento reducido y al cambiar la preferencia', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const video = page.locator('.intro video')
  await expect(video).toHaveAttribute('src', '/media/portada.mp4')
  const originalVideo = await video.elementHandle()
  await expect(page.locator('.intro[data-immediate="false"] .brand__stroke').first()).toHaveCSS('animation-name', 'write-stroke')
  const initialTime = await originalVideo.evaluate((element: HTMLVideoElement) => element.currentTime)
  expect(initialTime).toBeGreaterThanOrEqual(1)
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect.poll(() => originalVideo.evaluate(
    (element, time) => element.isConnected && (element as HTMLVideoElement).currentTime > time,
    initialTime,
  )).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.intro[data-immediate="false"] .intro__action')).toHaveCSS('animation-name', 'reveal')
  const button = page.getByRole('button', { name: 'Comencemos' })
  await expect(button).toBeEnabled()
  await page.keyboard.press('Tab')
  await expect(button).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
})

test('la portada cabe en móvil pequeño, referencia, horizontal y escritorio', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 632, height: 762 },
    { width: 941, height: 1672 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await openIntroWithMediaError(page)
    await page.evaluate(() => document.fonts.ready)
    const button = page.getByRole('button', { name: 'Comencemos' })
    await expect(page.locator('.intro__headline')).toBeInViewport({ ratio: .99 })
    await expect(page.locator('.intro__headline-second')).toHaveCSS('font-style', 'italic')
    await expect(page.locator('.intro__tagline')).toHaveText('Viajes diseñados contigo')
    await expect(page.locator('.intro__tagline')).toBeInViewport({ ratio: .99 })
    await expect(page.locator('.intro .brand')).toBeInViewport({ ratio: .99 })
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
