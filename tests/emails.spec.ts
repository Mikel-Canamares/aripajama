import { expect, test } from '@playwright/test'
const profiles = ['explorador','cultural','aventurero','contemplativo','espiritu_libre','gastronomico']
test('previsualiza los seis correos en escritorio y móvil con todos los recursos', async ({ page },testInfo) => {
  test.slow()
  for (const width of [1024,390,280]) {
    await page.setViewportSize({ width,height:900 })
    for (const profile of profiles) {
      await page.goto(`http://127.0.0.1:4321/${profile}`)
      await expect(page.getByRole('heading',{ name:'¡Hola!' })).toBeVisible()
      await expect(page.getByRole('heading',{ name:'¿Qué pasa ahora?' })).toBeVisible()
      await expect.poll(() => page.locator('img').evaluateAll(images => images.every(image => image.complete && image.naturalWidth > 0))).toBe(true)
      await page.evaluate(() => document.fonts.ready)
      // Mobile Chromium can expand innerWidth to fit overflowing content.
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      const overflow = await page.locator('h1,h2,h3,p').evaluateAll(nodes => nodes.filter(node => node.scrollWidth > node.clientWidth + 1).map(node => node.textContent))
      expect(overflow).toEqual([])
      await page.screenshot({ path:testInfo.outputPath(`email-${profile}-${width}.png`),fullPage:true })
    }
  }
})

test('los correos mantienen su anchura sin fuentes web y con imágenes bloqueadas', async ({ page }) => {
  test.slow()
  await page.route('**/media/email/**', route => route.abort())
  for (const width of [280,390,1024]) {
    await page.setViewportSize({ width,height:900 })
    for (const profile of profiles) {
      await page.goto(`http://127.0.0.1:4321/${profile}`)
      await page.evaluate(() => document.fonts.ready)
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
      await expect(page.getByRole('heading',{ name:'¿Qué pasa ahora?' })).toBeVisible()
      if (width < 600) {
        const farewell = (await page.locator('.farewell').boundingBox())!
        expect(farewell.width).toBeGreaterThan(width / 2)
      }
    }
  }
})
