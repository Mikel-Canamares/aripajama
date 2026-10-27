import { expect, test, type Page } from '@playwright/test'
import { DRAFT_KEY, TRIP_QUESTIONS } from '../src/data/questionnaire'
import { mockTripApi, seedFinalDraft } from './trip-request-helpers'

const root = '#crear-mi-viaje/cuestionario/'
const title = (page: Page) => page.locator('.questionnaire h1')
const next = (page: Page) => page.getByRole('button', { name: 'Continuar', exact: true })

async function seed(page: Page, count: number) {
  const answers = Object.fromEntries(TRIP_QUESTIONS.slice(0, count).map(question => [question.id, [question.options[0].id]]))
  await page.addInitScript(({ key, answers, count }) => sessionStorage.setItem(key, JSON.stringify({ version: 1, answers, step: count })), { key: DRAFT_KEY, answers, count })
}

async function open(page: Page, step = 1) {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`/${root}${step}`)
  await expect(title(page)).toBeFocused()
}

test('Descubrir abre el cuestionario y Volver restaura su foco y scroll', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/#crear-mi-viaje')
  const discover = page.getByRole('button', { name: 'Descubrir', exact: true })
  await discover.click()
  await expect(title(page)).toHaveText('¿Qué te mueve a viajar?')
  await expect(title(page)).toBeFocused()
  await expect(page.getByRole('heading', { name: 'Todo viaje empieza con una idea.' })).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(discover).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await page.goForward()
  await expect(title(page)).toBeFocused()
  await page.goBack()
  await expect(discover).toBeFocused()
})

test('exige respuesta, permite varias selecciones y no avanza automáticamente', async ({ page }) => {
  await open(page)
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
  await next(page).click()
  await expect(page.getByRole('alert')).toHaveText('Selecciona al menos una opción para continuar')
  await expect(page.locator('#question-options')).toBeFocused()
  const options = page.getByRole('checkbox')
  await options.nth(0).check()
  await options.nth(1).check()
  await expect(options.nth(0)).toBeChecked()
  await expect(options.nth(1)).toBeChecked()
  await expect(page).toHaveURL(/cuestionario\/1$/)
  await options.nth(0).uncheck()
  await expect(options.nth(0)).not.toBeChecked()
  await expect(page.getByRole('alert')).toBeEmpty()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(options.nth(1)).toBeChecked()
  await expect(next(page)).toBeFocused()
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '1')
})

test('recorre las diez preguntas y 52 opciones y continúa a detalles sin perder respuestas', async ({ page }) => {
  test.slow()
  await open(page)
  let optionsSeen = 0
  for (let step = 1; step <= 10; step++) {
    await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', String(step))
    await expect(title(page)).toBeFocused()
    const options = page.getByRole(step <= 8 ? 'checkbox' : 'radio')
    const count = await options.count()
    optionsSeen += count
    expect(count).toBe(step === 6 || step === 7 ? 6 : 5)
    await options.nth(0).check()
    await options.nth(1).check()
    if (step <= 8) await expect(options.nth(0)).toBeChecked()
    else await expect(options.nth(0)).not.toBeChecked()
    await next(page).click()
  }
  expect(optionsSeen).toBe(52)
  await expect(title(page)).toHaveText('Cuéntame los detalles prácticos.')
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', '10')
  await expect(next(page)).toBeFocused()
  for (let step = 9; step >= 1; step--) {
    await page.keyboard.press('Escape')
    await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', String(step))
    await expect(next(page)).toBeFocused()
  }
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked()
  await expect(page.getByRole('checkbox').nth(1)).toBeChecked()
  await page.reload()
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked()
  await expect(title(page)).toBeFocused()
})

test('recarga, enlaces directos y cierre protegido no reproducen la portada', async ({ page }) => {
  const videos: string[] = []
  page.on('request', request => { if (request.url().endsWith('.mp4')) videos.push(request.url()) })
  await open(page, 8)
  await expect(page).toHaveURL(/cuestionario\/1$/)
  await page.getByRole('checkbox').nth(2).check()
  await next(page).click()
  await expect(page).toHaveURL(/cuestionario\/2$/)
  await page.getByRole('checkbox').nth(0).check()
  await page.reload()
  await expect(title(page)).toBeFocused()
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked()
  await page.goto(`/${root}completado`)
  await expect(page).toHaveURL(/cuestionario\/3$/)
  await expect(title(page)).toHaveText('¿Cómo prefieres viajar?')
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page).toHaveURL(/cuestionario\/2$/)
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked()
  await page.goto('/#crear-mi-viaje')
  await page.locator('#create-trip-discover').click()
  await expect(page).toHaveURL(/cuestionario\/3$/)
  expect(videos).toEqual([])
})

test('recupera scroll, foco, selecciones e historial entre preguntas', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 600 })
  await open(page)
  await page.getByRole('checkbox').last().check()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  await page.goBack()
  await expect(next(page)).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBeGreaterThan(0)
  await expect(page.getByRole('checkbox').last()).toBeChecked()
  await page.goForward()
  await expect(title(page)).toBeFocused()
  expect(await page.evaluate(() => scrollY)).toBe(0)
})

test('regresa al hub desde una presentación abierta después del cierre', async ({ page }) => {
  await mockTripApi(page)
  await seedFinalDraft(page, { receipt: 'accepted' })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await page.getByRole('button', { name: 'Comencemos' }).click()
  const hub = page.getByRole('button', { name: 'Crear mi viaje', exact: true })
  await hub.click()
  await page.locator('#create-trip-discover').click()
  await expect(title(page)).toHaveText('Tu perfil está en camino.')
  await page.getByRole('button', { name: 'Volver a Crear mi viaje', exact: true }).click()
  await expect(page.locator('#create-trip-discover')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(hub).toBeFocused()
  await expect(page).not.toHaveURL(/crear-mi-viaje/)
})

test('descarta borradores corruptos o con opciones ajenas al cuestionario', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const raw of ['null', '{', JSON.stringify({ version: 1, step: 8, answers: { food: ['essential', 'local'] } }), JSON.stringify({ version: 1, step: 0, answers: { motivation: ['invented'] } })]) {
    await page.goto('/#crear-mi-viaje')
    await page.evaluate(({ key, raw }) => sessionStorage.setItem(key, raw), { key: DRAFT_KEY, raw })
    await page.reload()
    await page.goto(`/${root}10`)
    await expect(page).toHaveURL(/cuestionario\/1$/)
    await expect(title(page)).toBeFocused()
    await expect(page.locator('input:checked')).toHaveCount(0)
  }
})

test('funciona en memoria si sessionStorage está bloqueado', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'sessionStorage', { get() { throw new DOMException('Blocked', 'SecurityError') } })
  })
  await open(page)
  await page.getByRole('checkbox').nth(0).check()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('checkbox').nth(0)).toBeChecked()
  await expect(next(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.locator('#create-trip-discover')).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', { name: 'Crear mi viaje', exact: true })).toBeFocused()
  await page.getByRole('button', { name: 'Crear mi viaje', exact: true }).click()
  await page.locator('#create-trip-discover').click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
})

test('sin imágenes mantiene los controles y permite completar una pregunta', async ({ page }) => {
  await page.route('**/media/questionnaire/**', route => route.abort())
  await open(page)
  await expect(page.locator('.questionnaire')).toHaveAttribute('data-background', 'error')
  await page.getByRole('checkbox').first().check()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  await expect(title(page)).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('checkbox').first()).toBeChecked()
})

test('un fondo detenido permite responder y se recupera si termina de cargar', async ({ page }) => {
  let release!: () => void
  const held = new Promise<void>(resolve => { release = resolve })
  await page.route('**/media/questionnaire/globe.webp', async route => { await held; await route.continue() })
  try {
    await open(page)
    await page.getByRole('checkbox').first().check()
    await expect(next(page)).toBeEnabled()
    await expect(page.locator('.questionnaire')).toHaveAttribute('data-background', 'error')
    release()
    await expect(page.locator('.questionnaire')).toHaveAttribute('data-background', 'ready')
    await next(page).click()
    await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  } finally { release() }
})

test('cada parte de una opción aparece en orden con separación temporal', async ({ page }) => {
  await seed(page, 1)
  await page.setViewportSize({ width: 941, height: 1024 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`/${root}2`)
  await expect(title(page)).toBeFocused()
  const card = page.locator('.questionnaire__option').first()
  await expect(card.locator('.questionnaire__indicator')).toHaveAttribute('data-reveal-state', 'shown')
  const times = await card.locator('[data-reveal]').evaluateAll(nodes => nodes.map(node => Number((node as HTMLElement).dataset.revealStarted)))
  expect(times).toHaveLength(5)
  expect(times.every(Number.isFinite)).toBe(true)
  for (let index = 1; index < times.length; index++) expect(times[index] - times[index - 1]).toBeGreaterThanOrEqual(70)
})

test('el foco descubre controles pendientes y el scroll no repite las apariciones', async ({ page }) => {
  test.slow()
  await page.setViewportSize({ width: 390, height: 600 })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`/${root}1`)
  await expect(title(page)).toBeFocused()
  const card = page.locator('.questionnaire__option').last()
  await expect(card).toHaveAttribute('data-reveal-state', 'pending')
  await page.getByRole('checkbox').last().focus()
  await expect(card).toHaveAttribute('data-reveal-state', 'shown')
  await page.keyboard.press('Space')
  await expect(page.getByRole('checkbox').last()).toBeChecked()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  const firstCard = page.locator('.questionnaire__option').first()
  await firstCard.scrollIntoViewIfNeeded()
  await expect(firstCard).toHaveAttribute('data-reveal-state', 'shown')
  const started = await firstCard.getAttribute('data-reveal-started')
  await page.evaluate(() => scrollTo(0, document.body.scrollHeight))
  await firstCard.scrollIntoViewIfNeeded()
  await expect(firstCard).toHaveAttribute('data-reveal-state', 'shown')
  await expect(firstCard).toHaveAttribute('data-reveal-started', started!)
  await page.getByRole('checkbox').first().check()
  await expect(firstCard).toHaveAttribute('data-reveal-started', started!)
  await next(page).click()
  await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', '3')
  await page.goBack()
  await expect(firstCard).toHaveAttribute('data-reveal-state', 'shown')
})

test('movimiento reducido y cambio de preferencia completan la cascada y las transiciones', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`/${root}1`)
  await expect(title(page)).toBeFocused()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(page.locator('.questionnaire [data-reveal-state="pending"]')).toHaveCount(0)
  await page.getByRole('checkbox').first().check()
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await next(page).click()
  await expect(page.locator('.create-flow')).toHaveAttribute('inert', '')
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.create-flow')).not.toHaveAttribute('inert', '')
})

test('sin IntersectionObserver los elementos siguen visibles', async ({ page }) => {
  await page.addInitScript(() => { Object.defineProperty(window, 'IntersectionObserver', { value: undefined }) })
  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto(`/${root}1`)
  await expect(title(page)).toBeFocused()
  await expect(page.locator('.questionnaire [data-reveal-state="pending"]')).toHaveCount(0)
  await page.getByRole('checkbox').first().check()
  await next(page).click()
  await expect(title(page)).toHaveText('¿Qué tipo de destinos te atraen más?')
})

test('móvil, horizontal, tablet y escritorio mantienen opciones y controles legibles', async ({ page }, testInfo) => {
  test.slow()
  await seed(page, 10)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const viewport of [{ width: 280, height: 568 }, { width: 390, height: 844 }, { width: 768, height: 1024 }, { width: 941, height: 1672 }, { width: 1440, height: 900 }, { width: 844, height: 390 }]) {
    await page.setViewportSize(viewport)
    for (const step of [1, 9]) {
      await page.goto(`/${root}${step}`)
      await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', String(step))
      await expect(title(page)).toBeFocused()
      await page.locator('.questionnaire img[loading="lazy"]').evaluateAll(images => images.forEach(image => { (image as HTMLImageElement).loading = 'eager' }))
      await expect.poll(() => page.locator('.questionnaire img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      for (const control of await page.locator('.questionnaire button, .questionnaire__option').all()) {
        const box = (await control.boundingBox())!
        expect(box.height).toBeGreaterThanOrEqual(44)
        expect(box.width).toBeGreaterThanOrEqual(44)
        expect(box.x).toBeGreaterThanOrEqual(0)
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width + 1)
      }
      const overflow = await page.locator('.questionnaire h1, .questionnaire p, .questionnaire__copy, .questionnaire button').evaluateAll(nodes => nodes.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent))
      expect(overflow).toEqual([])
      await page.screenshot({ path: testInfo.outputPath(`question-${step}-${viewport.width}x${viewport.height}.png`), fullPage: true })
    }
  }
})

test('texto al 200 % conserva opciones y acciones sin desbordamiento', async ({ page }, testInfo) => {
  await seed(page, 10)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  for (const step of [1, 7, 9]) {
    await page.goto(`/${root}${step}`)
    await expect(page.locator('.questionnaire')).toHaveAttribute('data-question', String(step))
    await expect(title(page)).toBeFocused()
    await page.addStyleTag({ content: 'html { font-size: 200%; }' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const overflow = await page.locator('.questionnaire h1, .questionnaire h2, .questionnaire p, .questionnaire__copy, .questionnaire button').evaluateAll(nodes => nodes.filter(el => el.scrollWidth > el.clientWidth + 1).map(el => el.textContent))
    expect(overflow).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`question-${step}-text-200.png`), fullPage: true })
  }
})
