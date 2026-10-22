import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function prepareEntry(page: Page) {
  await page.goto('/')
  const video = page.locator('.intro video')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => Number.isFinite(element.duration))).toBe(true)
  await video.evaluate((element: HTMLVideoElement) => { element.currentTime = element.duration - .1 })
  await expect(page.getByRole('button', { name: 'Comencemos' })).toBeEnabled()
}

test('entra con fundido sobre un fondo preparado y reproduce el bucle real', async ({ page }, testInfo) => {
  test.setTimeout(45_000)
  await prepareEntry(page)
  // Inspect the real transitions at their midpoint, independent of rendering load.
  const crossfade = page.evaluate(() => new Promise<{ ready: boolean; introOpacity: number; hubOpacity: number; duration: number }>((resolve) => {
    const inspect = (event: TransitionEvent) => {
      const hub = event.target as HTMLElement
      if (!hub.classList.contains('experience__journey') || event.propertyName !== 'opacity') return
      document.removeEventListener('transitionrun', inspect)
      const intro = document.querySelector('.experience__intro')!
      const animations = [...hub.getAnimations(), ...intro.getAnimations()]
      for (const animation of animations) {
        animation.pause()
        animation.currentTime = 400
      }
      const image = hub.querySelector('img.journey__film') as HTMLImageElement
      const video = hub.querySelector('video') as HTMLVideoElement
      const frame = {
        ready: (image.complete && image.naturalWidth > 0) || video.readyState >= 2,
        introOpacity: Number(getComputedStyle(intro).opacity),
        hubOpacity: Number(getComputedStyle(hub).opacity),
        duration: Number(animations[0].effect!.getTiming().duration),
      }
      for (const animation of animations) animation.play()
      resolve(frame)
    }
    document.addEventListener('transitionrun', inspect)
  }))
  await page.getByRole('button', { name: 'Comencemos' }).click()
  const experience = page.locator('.experience')
  const frame = await crossfade
  expect(frame.ready).toBe(true)
  expect(frame.introOpacity).toBeGreaterThan(.1)
  expect(frame.introOpacity).toBeLessThan(.9)
  expect(frame.hubOpacity).toBeGreaterThan(.1)
  expect(frame.hubOpacity).toBeLessThan(.9)
  expect(frame.duration).toBe(800)
  await page.screenshot({ path: testInfo.outputPath('fundido-al-hub.png') })
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await expect(page.locator('.intro')).toHaveCount(0)
  for (const choice of await page.locator('.journey__choice').all()) {
    await expect(choice).toHaveCSS('opacity', '1')
  }

  const video = page.locator('.journey video')
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.1)
  expect(await video.evaluate((element: HTMLVideoElement) => ({
    loop: element.loop, muted: element.muted, inline: element.playsInline, paused: element.paused,
  }))).toEqual({ loop: true, muted: true, inline: true, paused: false })
  const duration = await video.evaluate((element: HTMLVideoElement) => element.duration)
  expect(duration).toBeCloseTo(8.75, 2)
  for (let cycle = 0; cycle < 2; cycle++) {
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { intervals: [100] }).toBeGreaterThan(duration - .5)
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime), { intervals: [50] }).toBeLessThan(2)
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.ended || element.paused)).toBe(false)
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(.1)
  }

  await page.getByRole('button', { name: 'Pausar fondo' }).click()
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  await video.evaluate((element: HTMLVideoElement) => new Promise<void>((resolve) => {
    element.addEventListener('seeked', () => resolve(), { once: true })
    element.currentTime = .25
  }))
  expect(await video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true)
  await page.getByRole('button', { name: 'Reproducir fondo' }).click()
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
  await page.screenshot({ path: testInfo.outputPath('hub-en-reproduccion.png') })

  await page.getByRole('button', { name: 'Volver a la portada' }).click()
  await expect(experience).toHaveAttribute('data-phase', 'returning')
  await expect(page.locator('.intro')).toHaveAttribute('data-revealed', 'false')
  await expect(experience).toHaveAttribute('data-phase', 'intro')
  await expect(page.locator('.journey')).toHaveCount(0)
})

test('un fallo de decodificación conserva el fondo estático y la navegación', async ({ page }) => {
  await prepareEntry(page)
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('button', { name: 'Pausar fondo' })).toBeVisible()
  await page.locator('.journey video').evaluate((video: HTMLVideoElement) => {
    video.src = 'data:video/mp4;base64,AAAA'
    video.load()
  })
  await expect(page.locator('.journey video')).toHaveCount(0)
  await expect(page.locator('.journey img.journey__film')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Volver a la portada' })).toBeEnabled()
})

test('permite reproducir el fondo si se bloquea el autoplay del hub', async ({ page }) => {
  await page.addInitScript(() => {
    const play = HTMLMediaElement.prototype.play
    let allowHubPlayback = false
    document.addEventListener('click', (event) => {
      if ((event.target as Element).closest('button')?.textContent === 'Reproducir fondo') allowHubPlayback = true
    }, true)
    HTMLMediaElement.prototype.play = function () {
      if (this.classList.contains('journey__film') && !allowHubPlayback) {
        this.pause()
        this.removeAttribute('autoplay')
        return Promise.reject(new DOMException('Autoplay blocked', 'NotAllowedError'))
      }
      return play.call(this)
    }
  })
  await prepareEntry(page)
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await page.getByRole('button', { name: 'Reproducir fondo' }).click()
  await expect(page.getByRole('button', { name: 'Pausar fondo' })).toBeVisible()
  await expect.poll(() => page.locator('.journey video').evaluate((element: HTMLVideoElement) => element.paused)).toBe(false)
})

test('el hub estático respeta movimiento reducido y cabe en todos los encuadres', async ({ page }, testInfo) => {
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
    await expect(page.locator('.journey__subtitle')).toHaveText(/Conóceme, inspírate y empieza\s*a crear tu próxima historia\./)
    await expect(page.locator('.journey__choices a, .journey__choices button, .journey__choices [tabindex]')).toHaveCount(0)
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
  expect(videoRequests).toEqual([])
})
