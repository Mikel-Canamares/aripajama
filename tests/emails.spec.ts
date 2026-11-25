import { expect, test } from '@playwright/test'
import { PROFILE_IDS } from '../server/profiles.ts'
import { EMAIL_PROFILES, EMAIL_STEPS } from '../server/email-content.ts'
import { renderProfileEmail } from '../server/email-template.ts'
import { applyEmailScenario, emailScenarios, emailWidths, measureEmail } from './email-layout.ts'
import { previewBookingLink, previewSignedTestLink, sessionPreview } from '../scripts/email-fixtures.ts'

for (const profile of PROFILE_IDS) for (const scenario of emailScenarios) {
  test(`${profile}: ${scenario}, nueve anchos, con y sin enlace WhatsApp`, async ({ page }, testInfo) => {
    test.setTimeout(120_000)
    const previewUrl = String(testInfo.config.metadata.emailPreviewUrl || 'http://127.0.0.1:4321')
    // All generated HTTPS assets are served locally. No external requests.
    await page.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin === previewUrl) {
        if (scenario === 'blocked-assets' && url.pathname.startsWith('/media/email/')) return route.abort()
        return route.continue()
      }
      if (url.hostname === 'preview.example.test' && url.pathname.startsWith('/media/email/')) {
        if (scenario === 'blocked-assets') return route.abort()
        return route.fulfill({ path: `public${url.pathname}` })
      }
      return route.abort()
    })
    for (const whatsapp of [undefined, 'https://wa.me/34000000000?text=Hola%20Aripajama']) {
      for (const width of emailWidths) {
        await page.setViewportSize({ width, height: 900 })
        if (whatsapp) await page.setContent(renderProfileEmail(profile, 'https://preview.example.test', whatsapp, previewBookingLink).html)
        else await page.goto(`${previewUrl}/${profile}`)
        await page.evaluate(() => document.fonts.ready)
        await applyEmailScenario(page, scenario)
        await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible()
        await expect(page.getByRole('heading', { name: EMAIL_PROFILES[profile].title, exact: true })).toBeVisible()
        await expect(page.getByText(EMAIL_PROFILES[profile].description, { exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: '¿Qué pasa ahora?' })).toBeVisible()
        for (const step of EMAIL_STEPS) await expect(page.getByRole('heading', { name: step.title, exact: true })).toBeVisible()
        if (whatsapp) {
          await expect(page.getByRole('link', { name: 'Reserva tu primera sesión', exact: true })).toHaveAttribute('href', previewBookingLink)
          await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveCount(2)
          for (const link of await page.getByRole('link', { name: 'WhatsApp', exact: true }).all()) await expect(link).toHaveAttribute('href', whatsapp)
        }
        else await expect(page.getByText('La reserva online estará disponible próximamente.', { exact: true })).toBeVisible()
        if (scenario !== 'blocked-assets') await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0))).toBe(true)
        const result = await measureEmail(page, width)
        const context = `${testInfo.project.name}, ${profile}, ${scenario}, ${width}, whatsapp=${Boolean(whatsapp)}`
        expect(result.clientWidth, context).toBe(width)
        expect(result.scrollWidth, context).toBeLessThanOrEqual(width + 1)
        expect(result.outside, context).toEqual([])
        expect(result.textOverflow, context).toEqual([])
        expect(result.imageOverflow, context).toEqual([])
        expect(result.overlaps, context).toEqual([])
        if (scenario === 'normal' || scenario === 'blocked-assets') {
          if (width <= 360) {
            for (const [decoration, copy] of [['.profile-icon-cell', '.profile-copy'], ['.leaf-cell', '.important-copy']]) {
              const icon = (await page.locator(decoration).boundingBox())!
              const text = (await page.locator(copy).boundingBox())!
              expect(text.y, context).toBeGreaterThanOrEqual(icon.y + icon.height - 1)
              expect(Math.abs(text.x - icon.x), context).toBeLessThanOrEqual(1)
            }
          }
          const boxes = await page.locator('.step-cell').evaluateAll(nodes => nodes.map(node => ({ x: node.getBoundingClientRect().x, y: node.getBoundingClientRect().y })))
          if (width <= 360) expect(boxes.every((box, index) => index === 0 || box.y > boxes[index - 1].y), context).toBe(true)
          else if (width <= 600) {
            expect(boxes[0].y, context).toBe(boxes[1].y)
            expect(boxes[2].y, context).toBe(boxes[3].y)
            expect(boxes[2].y, context).toBeGreaterThan(boxes[0].y)
          } else expect(new Set(boxes.map(box => box.y)).size, context).toBe(1)
          const farewell = (await page.locator('.farewell').boundingBox())!
          if (width <= 600) expect(farewell.width, context).toBeGreaterThan(width / 2)
        }
        if (!whatsapp) await page.screenshot({ path: testInfo.outputPath(`email-${width}.png`), fullPage: true })
      }
    }
  })
}

for (const scenario of emailScenarios) test(`aviso pagado: ${scenario}, nueve anchos`, async ({ page }, testInfo) => {
  await page.route('**/*', route => route.abort())
  const email = sessionPreview()
  for (const width of emailWidths) {
    await page.setViewportSize({ width, height: 900 })
    await page.setContent(email.html)
    await applyEmailScenario(page, scenario)
    await expect(page.getByRole('heading', { name: 'Primera sesión confirmada · 40 €', exact: true })).toBeVisible()
    await expect(page.getByText('Cuestionario completo', { exact: true })).toBeVisible()
    await expect(page.getByRole('link')).toHaveAttribute('href', 'https://meet.google.com/ejemplo-simulado')
    const measured = await measureEmail(page, width)
    expect(measured.scrollWidth).toBeLessThanOrEqual(width + 1)
    expect(measured.outside).toEqual([]); expect(measured.textOverflow).toEqual([]); expect(measured.overlaps).toEqual([])
    await page.screenshot({ path: testInfo.outputPath(`paid-session-${width}.png`), fullPage: true })
  }
})

for (const profile of PROFILE_IDS) test(`perfil de prueba en producción: ${profile}`, async ({ page }) => {
  await page.route('**/*', route => {
    const url = new URL(route.request().url())
    if (url.hostname === 'preview.example.test' && /^\/media\/email\/[a-z0-9_-]+\.(png|jpg|woff2)$/.test(url.pathname)) return route.fulfill({ path: `public${url.pathname}` })
    return route.abort()
  })
  for (const width of [280,390,1024]) for (const scenario of ['normal','no-head-css'] as const) {
    await page.setViewportSize({ width, height: 900 })
    const email = renderProfileEmail(profile,'https://preview.example.test',undefined,previewSignedTestLink)
    await page.setContent(email.html); await page.evaluate(() => document.fonts.ready); await applyEmailScenario(page,scenario)
    await expect(page.getByRole('link',{ name:'Probar primera sesión · sin cobro',exact:true })).toHaveAttribute('href',previewSignedTestLink)
    await expect(page.getByText('PRUEBA: reserva y pago simulados de 40 €. No se crea ninguna cita ni se realiza ningún cobro.',{exact:true})).toBeVisible()
    expect(email.text).toContain(previewSignedTestLink); expect(email.subject).toContain('[PRUEBA]')
    const measured=await measureEmail(page,width)
    expect(measured.scrollWidth).toBeLessThanOrEqual(width+1); expect(measured.textOverflow).toEqual([]); expect(measured.overlaps).toEqual([])
  }
})

test('aviso de producción simulado muestra su identificación sin desbordar', async ({ page }) => {
  await page.route('**/*',route=>route.abort())
  for (const width of [280,390,1024]) {
    await page.setViewportSize({width,height:900}); await page.setContent(sessionPreview(true).html)
    await expect(page.getByRole('heading',{name:'[PRUEBA] Primera sesión simulada · 40 €',exact:true})).toBeVisible()
    await expect(page.getByText('Pago simulado (sin cobro)',{exact:true})).toBeVisible()
    const measured=await measureEmail(page,width)
    expect(measured.scrollWidth).toBeLessThanOrEqual(width+1); expect(measured.textOverflow).toEqual([])
  }
})
