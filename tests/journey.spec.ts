import { expect, test } from '@playwright/test'

test('entra con el fondo preparado y regresa con el control de teclado', async ({ page }, testInfo) => {
  await page.goto('/')
  const video = page.locator('.intro video')
  // Exercise the real crossfade independently of platform video codecs.
  await video.evaluate((element: HTMLVideoElement) => {
    element.src = 'data:video/mp4;base64,AAAA'
    element.load()
  })
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'ready')
  await page.screenshot({ path: testInfo.outputPath('hub.png') })
  const back = page.getByRole('button', { name: 'Volver a la portada' })
  await expect(back).toHaveCSS('opacity', '0')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(back).toBeFocused()
  await expect(back).toHaveCSS('opacity', '1')
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
  await back.click()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
  await expect(page.locator('.journey')).toHaveCount(0)
})

test('conserva la composición completa en móvil, referencia y escritorio', async ({ page }, testInfo) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const videoRequests: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) videoRequests.push(request.url()) })
  for (const viewport of [
    { width: 280, height: 568 },
    { width: 320, height: 568 },
    { width: 384, height: 915 },
    { width: 390, height: 844 },
    { width: 942, height: 1670 },
    { width: 844, height: 390 },
    { width: 1440, height: 900 },
  ]) {
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: 'Comencemos' }).click()
    await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
    await page.evaluate(() => document.fonts.ready)
    await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'ready')
    await expect(page.locator('video')).toHaveCount(0)
    await expect(page.locator('.journey__canvas')).toBeInViewport({ ratio: .99 })
    await expect(page.locator('.journey__header')).toBeInViewport({ ratio: .99 })
    await expect(page.locator('.journey__subtitle')).toHaveText(/Conóceme, inspírate y empieza\s*a crear tu próxima historia\./)
    await expect(page.locator('.journey__cards button')).toHaveCount(1)
    await expect(page.getByRole('button', { name: 'Biblioteca de viajes', exact: true })).toBeEnabled()
    const canvas = (await page.locator('.journey__canvas').boundingBox())!
    expect(canvas.width).toBeLessThanOrEqual(viewport.width)
    expect(canvas.height).toBeLessThanOrEqual(viewport.height + 1)
    if (viewport.width / viewport.height >= 1) {
      // Landscape & desktop: content is positioned in the right half alongside the artwork
      expect(canvas.x).toBeGreaterThanOrEqual(viewport.width * 0.45)
    } else {
      // Mobile & reference portrait: canvas is centered
      expect(canvas.x + canvas.width / 2).toBeCloseTo(viewport.width / 2, 1)
    }
    let previousBottom = (await page.locator('.journey__header').boundingBox())!.y
    for (const card of await page.locator('.journey__card').all()) {
      await expect(card).toBeInViewport({ ratio: .99 })
      const title = card.locator('h2')
      const subtitle = card.locator('p')
      const bounds = (await card.boundingBox())!
      for (const text of [title, subtitle]) {
        const box = (await text.boundingBox())!
        expect(box.x).toBeGreaterThan(bounds.x)
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width)
        expect(box.y).toBeGreaterThan(previousBottom)
        expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height)
        // Editable copy must fit its allotted area without wrapping into the arrow.
        expect(await text.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
      }
      previousBottom = bounds.y + bounds.height
      await expect(card).toHaveCSS('animation-name', 'none')
    }
    await expect(page.getByRole('heading', { name: 'Biblioteca de viajes' })).toBeVisible()
    await expect(page.locator('.journey__back')).toHaveCSS('opacity', '0')
    const geometry = await page.evaluate(() => ({
      width: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      height: window.innerHeight,
      scrollHeight: document.documentElement.scrollHeight,
    }))
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.width)
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.height + 1)
    await page.screenshot({ path: testInfo.outputPath(`hub-${viewport.width}x${viewport.height}.png`), fullPage: true })
    await page.keyboard.press('Escape')
    await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
  }
  expect(videoRequests).toEqual([])
})

test('espera al recurso antes de empezar el fundido', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/hub-clean.webp', async route => {
    await held
    await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'preparing')
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'loading')
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toHaveCount(0)
  release()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'ready')
})

test('un error de imagen conserva textos y regreso accesibles', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/media/hub-clean.webp', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'error')
  await expect(page.getByRole('heading', { name: 'Crear mi viaje' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.experience')).toHaveAttribute('data-phase', 'intro')
})

test('una carga detenida permite entrar y se recupera al llegar la imagen', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/hub-clean.webp', async route => {
    await held
    await route.continue()
  })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'error')
  release()
  await expect(page.locator('.journey')).toHaveAttribute('data-artwork', 'ready')
})

test('texto, tamaño y color se pueden cambiar sin sustituir el fondo', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.getByRole('heading', { name: 'Tu viaje, en tres formas' })).toBeFocused()
  const title = page.locator('.journey__card-title').first()
  const before = await title.evaluate(el => parseFloat(getComputedStyle(el).fontSize))
  await page.locator('.journey').evaluate(el => {
    const hub = el as HTMLElement
    hub.style.setProperty('--journey-card-size', '7cqw')
    hub.style.setProperty('--journey-card-color', '#345678')
    hub.querySelector('h2')!.textContent = 'Sobre mí'
  })
  await expect(title).toHaveText('Sobre mí')
  await expect(title).toHaveCSS('color', 'rgb(52, 86, 120)')
  expect(await title.evaluate(el => parseFloat(getComputedStyle(el).fontSize))).toBeGreaterThan(before)
  await expect(page.locator('.journey__artwork')).toHaveAttribute('src', '/media/hub-clean.webp')
})
