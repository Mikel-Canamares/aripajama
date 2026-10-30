import { expect, test } from '@playwright/test'
import { PROFILE_IDS } from '../server/profiles.ts'
import { EMAIL_PROFILES, EMAIL_STEPS } from '../server/email-content.ts'
import { renderProfileEmail } from '../server/email-template.ts'
import { applyEmailScenario, emailScenarios, emailWidths, measureEmail } from './email-layout.ts'

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
        if (whatsapp) await page.setContent(renderProfileEmail(profile, 'https://preview.example.test', whatsapp).html)
        else await page.goto(`${previewUrl}/${profile}`)
        await page.evaluate(() => document.fonts.ready)
        await applyEmailScenario(page, scenario)
        await expect(page.getByRole('heading', { name: '¡Hola!' })).toBeVisible()
        await expect(page.getByRole('heading', { name: EMAIL_PROFILES[profile].title, exact: true })).toBeVisible()
        await expect(page.getByText(EMAIL_PROFILES[profile].description, { exact: true })).toBeVisible()
        await expect(page.getByRole('heading', { name: '¿Qué pasa ahora?' })).toBeVisible()
        for (const step of EMAIL_STEPS) await expect(page.getByRole('heading', { name: step.title, exact: true })).toBeVisible()
        if (whatsapp) {
          await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveCount(2)
          for (const link of await page.getByRole('link', { name: 'WhatsApp', exact: true }).all()) await expect(link).toHaveAttribute('href', whatsapp)
        }
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
