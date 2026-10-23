import { expect, test, type Page } from '@playwright/test'

async function openHub(page: Page) {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.route('**/media/portada.mp4', route => route.abort())
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  await expect(page.locator('.journey__title')).toBeFocused()
}

async function settleVisible(page: Page, scope: string) {
  await expect.poll(() => page.locator(scope).evaluate(root => [...root.querySelectorAll<HTMLElement>('[data-reveal]')]
    .filter(node => { const box = node.getBoundingClientRect(); return box.bottom > 0 && box.top < innerHeight - 16 })
    .every(node => node.dataset.revealState === 'shown')), { timeout: 25_000 }).toBe(true)
}

test('el hub revela título, subtítulo y cada parte de sus tarjetas en cascada', async ({ page }) => {
  await openHub(page)
  await expect(page.locator('.journey__card').last()).toHaveAttribute('data-reveal-state', /pending|queued|running/)
  await settleVisible(page, '.journey')
  const times = await page.locator('.journey [data-reveal]').evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.revealStarted)))
  expect(times.every(Number.isFinite)).toBe(true)
  for (let index = 1; index < times.length; index++) expect(times[index]).toBeGreaterThan(times[index - 1])
  expect(times[2] - times[1]).toBeGreaterThanOrEqual(70)
  await expect(page.locator('.journey__card-link').last()).toBeEnabled()
})

test('la entrada muestra opacidad intermedia y deja los elementos siguientes pendientes', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    const samples: number[] = []
    Object.assign(window, { revealOpacitySamples: samples })
    new MutationObserver(records => {
      for (const record of records) {
        const node = record.target as HTMLElement
        if (!node.matches('.create-trip__header h1') || node.dataset.revealState !== 'running') continue
        function sample() {
          samples.push(Number(getComputedStyle(node).opacity))
          if (node.dataset.revealState === 'running') requestAnimationFrame(sample)
        }
        requestAnimationFrame(sample)
      }
    }).observe(document, { subtree: true, attributes: true, attributeFilter: ['data-reveal-state'] })
  })
  await openHub(page)
  await page.getByRole('button', { name: 'Crear mi viaje', exact: true }).click()
  await expect(page.locator('.create-trip h1')).toBeFocused()
  await expect(page.locator('.create-trip__header p')).toHaveAttribute('data-reveal-state', /queued|running/)
  await expect.poll(() => page.evaluate(() => (window as typeof window & { revealOpacitySamples: number[] }).revealOpacitySamples.some(value => value > 0 && value < 1))).toBe(true)
  await expect(page.locator('.create-trip__header p')).toHaveAttribute('data-reveal-state', 'shown')
  const starts = await page.locator('.create-trip__header [data-reveal]').evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.revealStarted)))
  expect(starts[1]).toBeGreaterThan(starts[0])
  expect(starts[2] - starts[1]).toBeGreaterThanOrEqual(70)
  await page.screenshot({ path: testInfo.outputPath('create-sequence.png') })
})

test('el scroll descubre el pie sin acumular retrasos y no lo repite al volver', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#crear-mi-viaje')
  const footer = page.locator('.create-trip__footer')
  const text = footer.locator('span').first()
  await expect(text).toHaveAttribute('data-reveal-state', 'pending')
  expect(await text.evaluate(node => getComputedStyle(node).opacity)).toBe('0')
  await footer.scrollIntoViewIfNeeded()
  await settleVisible(page, '.create-trip__content')
  await expect(text).toHaveAttribute('data-reveal-state', 'shown')
  const firstStart = await text.getAttribute('data-reveal-started')
  const delay = Number(await text.getAttribute('data-reveal-delay'))
  const documentDelay = await text.evaluate(node => [...node.closest('[data-reveal-scope]')!.querySelectorAll('[data-reveal]')].indexOf(node) * 140)
  expect(delay).toBeLessThan(documentDelay)
  await page.evaluate(() => window.scrollTo(0, 0))
  await footer.scrollIntoViewIfNeeded()
  await expect(text).toHaveAttribute('data-reveal-state', 'shown')
  await expect(text).toHaveAttribute('data-reveal-started', firstStart!)
})

test('el teclado revela una tarjeta pendiente y permite navegar durante la cascada', async ({ page }) => {
  await openHub(page)
  const button = page.getByRole('button', { name: 'Crear mi viaje', exact: true })
  await button.focus()
  await expect(page.locator('.journey__card--create [data-reveal]').first()).toHaveAttribute('data-reveal-state', 'shown')
  await expect(page.locator('.journey__card--create')).toHaveCSS('opacity', '1')
  await page.keyboard.press('Enter')
  await expect(page.locator('.create-trip h1')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(page.locator('.journey__card--create')).toHaveAttribute('data-reveal-state', 'shown')
})

test('los listados por columnas se revelan por posición visual y no por columna del DOM', async ({ page }) => {
  test.slow()
  await page.setViewportSize({ width: 1440, height: 1100 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#biblioteca/viajes?continente=asia')
  await settleVisible(page, '.library__content')
  const cards = await page.locator('.catalog__trip').evaluateAll(nodes => nodes.map(node => {
    const element = node as HTMLElement
    const box = element.getBoundingClientRect()
    return { top: box.top, left: box.left, time: Number(element.dataset.revealStarted) }
  }).filter(item => item.top < innerHeight - 16))
  expect(cards.length).toBeGreaterThan(2)
  const firstRow = cards.filter(item => item.top <= Math.min(...cards.map(item => item.top)) + 12).sort((a, b) => a.left - b.left)
  expect(firstRow.length).toBeGreaterThan(1)
  for (let index = 1; index < firstRow.length; index++) expect(firstRow[index].time).toBeGreaterThan(firstRow[index - 1].time)
  const below = cards.filter(item => item.top > firstRow[0].top + 12)
  if (below.length) expect(Math.min(...below.map(item => item.time))).toBeGreaterThan(Math.max(...firstRow.map(item => item.time)))
})

test('historial conserva lo visto, scroll y foco; una visita nueva vuelve a animarse', async ({ page }) => {
  test.slow()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#biblioteca/paises')
  await expect(page.getByRole('heading', { level: 1, name: 'Países' })).toBeFocused()
  const peru = page.locator('#country-PE')
  await peru.scrollIntoViewIfNeeded()
  await peru.focus()
  const scroll = await page.evaluate(() => window.scrollY)
  const oldEntry = await page.evaluate(() => history.state.revealEntry)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Perú' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(peru).toBeFocused()
  await expect(peru).toHaveAttribute('data-reveal-state', 'shown')
  expect(await page.evaluate(() => window.scrollY)).toBeCloseTo(scroll, 0)
  expect(await page.evaluate(() => history.state.revealEntry)).toBe(oldEntry)
  await page.keyboard.press('Escape')
  await expect(page.getByRole('heading', { level: 1, name: 'Biblioteca de viajes' })).toBeFocused()
  await page.locator('#library-countries').focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'Países' })).toBeFocused()
  expect(await page.evaluate(() => history.state.revealEntry)).not.toBe(oldEntry)
  await expect(peru).toHaveAttribute('data-reveal-state', 'pending')
})

test('movimiento reducido completa las apariciones y cancela las esperas activas', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#crear-mi-viaje')
  await expect(page.locator('[data-reveal-state="pending"]').first()).toBeAttached()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('[data-reveal-state="pending"], [data-reveal-state="queued"], [data-reveal-state="running"]')).toHaveCount(0)
  await expect(page.locator('.create-trip__footer span').first()).toHaveCSS('opacity', '1')
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await expect(page.locator('[data-reveal-state="pending"], [data-reveal-state="queued"], [data-reveal-state="running"]')).toHaveCount(0)
})

test('sin IntersectionObserver o con error de inicialización el contenido permanece visible', async ({ page }) => {
  await page.addInitScript(() => {
    const mode = new URLSearchParams(location.search).get('observer')
    Object.defineProperty(window, 'IntersectionObserver', { configurable: true, value: mode === 'missing' ? undefined : class { constructor() { throw new Error('Observer unavailable') } } })
  })
  for (const mode of ['missing', 'throw']) {
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto(`/?observer=${mode}#crear-mi-viaje`)
    await expect(page.locator('.create-trip h1')).toBeFocused()
    await expect(page.locator('.create-trip [data-reveal-state="pending"], .create-trip [data-reveal-state="queued"], .create-trip [data-reveal-state="running"]')).toHaveCount(0)
    await expect(page.locator('.create-trip__footer span').first()).toHaveCSS('opacity', '1')
    await page.getByRole('button', { name: 'Volver', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Crear mi viaje', exact: true })).toBeFocused()
  }
})

test('ficha y visor usan ámbitos independientes y dejan el cierre disponible', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/#biblioteca/viajes/tailandia')
  await expect(page.getByRole('heading', { level: 1, name: 'Tailandia' })).toBeFocused()
  const button = page.getByRole('button', { name: 'Ver las láminas originales' })
  await button.focus()
  await page.keyboard.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.locator('[data-reveal-state]').first()).toBeAttached()
  await expect(page.getByRole('button', { name: 'Cerrar visor' })).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(button).toBeFocused()
  await expect(page.locator('.library__view')).toHaveAttribute('data-stage', 'idle')
  await page.locator('.trip-index').getByRole('button', { name: 'Esencia' }).click()
  await expect(page.locator('#trip-esencia')).toBeFocused()
  await expect(page.locator('#trip-esencia')).toHaveAttribute('data-reveal-state', /running|shown/)
})

test('los encuadres y el texto ampliado conservan su geometría con las animaciones', async ({ page }, testInfo) => {
  test.slow()
  for (const viewport of [{ width: 280, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport)
    await page.emulateMedia({ reducedMotion: 'no-preference' })
    await page.goto('/#crear-mi-viaje')
    await settleVisible(page, '.create-trip__content')
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.screenshot({ path: testInfo.outputPath(`reveal-complete-${viewport.width}.png`), fullPage: true })
  }
  await page.setViewportSize({ width: 390, height: 844 })
  await page.addStyleTag({ content: 'html { font-size: 200%; }' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
  await page.screenshot({ path: testInfo.outputPath('reveal-text-200.png'), fullPage: true })
})
