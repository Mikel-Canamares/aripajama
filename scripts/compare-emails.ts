import { chromium, webkit } from '@playwright/test'
import sharp from 'sharp'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { basename, extname, resolve } from 'node:path'
import { PROFILE_IDS } from '../server/profiles.ts'
import { renderProfileEmail } from '../server/email-template.ts'
import { applyEmailScenario, emailScenarios, emailWidths, measureEmail } from '../tests/email-layout.ts'

// Local HTML and assets only. No Worker, database, credentials or email provider.
const root = resolve('.cache/email-responsive-audit')
if (process.argv.includes('--capture-before')) {
  await mkdir(resolve(root, 'before'), { recursive: true })
  for (const profile of PROFILE_IDS) {
    await writeFile(resolve(root, 'before', `${profile}.html`), renderProfileEmail(profile, 'https://preview.example.test').html, { flag: 'wx' })
  }
  console.log(`Baseline saved in ${resolve(root, 'before')}; existing baselines are never overwritten.`)
  process.exit(0)
}
const afterOnly = process.argv.includes('--after-only')
const results: ({ phase: string; engine: string; profile: string; scenario: string } & Awaited<ReturnType<typeof measureEmail>>)[] = afterOnly
  ? JSON.parse(await readFile(resolve(root, 'comparison-metrics.json'), 'utf8')).filter((row: { phase: string }) => row.phase === 'before')
  : []
for (const [engineName, engine] of Object.entries({ chromium, webkit })) {
  const browser = await engine.launch()
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 }, isMobile: true, deviceScaleFactor: 1 })
    let blocked = false
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (blocked || url.hostname !== 'preview.example.test' || !/^\/media\/email\/[a-z0-9_-]+\.(png|jpg|woff2)$/.test(url.pathname)) return route.abort()
      const name = basename(url.pathname)
      await route.fulfill({
        body: await readFile(resolve('public/media/email', name)),
        contentType: ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' })[extname(name)],
      })
    })
    for (const phase of afterOnly ? ['after'] : ['before', 'after']) {
      const directory = resolve(root, phase, engineName)
      await mkdir(directory, { recursive: true })
      for (const profile of PROFILE_IDS) {
        const html = phase === 'before'
          ? await readFile(resolve(root, 'before', `${profile}.html`), 'utf8')
          : renderProfileEmail(profile, 'https://preview.example.test').html
        if (phase === 'after') await writeFile(resolve(root, phase, `${profile}.html`), html)
        for (const scenario of emailScenarios) {
          blocked = scenario === 'blocked-assets'
          for (const width of emailWidths) {
            await page.setViewportSize({ width, height: 900 })
            await page.setContent(html)
            await page.evaluate(() => document.fonts.ready)
            await applyEmailScenario(page, scenario)
            const metrics = await measureEmail(page, width)
            results.push({ phase, engine: engineName, profile, scenario, ...metrics })
            await page.screenshot({ path: resolve(directory, `${profile}-${scenario}-${width}.png`), fullPage: true })
          }
        }
        console.log(`${phase} ${engineName}: ${profile}`)
      }
    }
  } finally { await browser.close() }
}
await writeFile(resolve(root, 'comparison-metrics.json'), JSON.stringify(results, null, 2))
const comparisons = resolve(root, 'comparisons')
await mkdir(comparisons, { recursive: true })
const differences = []
for (const engine of ['chromium', 'webkit']) {
  for (const profile of PROFILE_IDS) {
    for (const width of [280, 390, 600, 640, 1024]) {
      for (const scenario of ['normal', 'no-head-css']) {
        const filename = `${profile}-${scenario}-${width}.png`
        const before = resolve(root, 'before', engine, filename)
        const after = resolve(root, 'after', engine, filename)
        const a = await sharp(before).metadata(), b = await sharp(after).metadata()
        const height = Math.max(a.height!, b.height!)
        await sharp({ create: { width: a.width! + b.width! + 12, height, channels: 3, background: '#ddd' } })
          .composite([{ input: before, left: 0, top: 0 }, { input: after, left: a.width! + 12, top: 0 }])
          .png().toFile(resolve(comparisons, `${engine}-${filename}`))
        if (scenario === 'normal' && width >= 600) {
          const bufferA = await sharp(before).ensureAlpha().raw().toBuffer()
          const bufferB = await sharp(after).ensureAlpha().raw().toBuffer()
          const sameDimensions = a.width === b.width && a.height === b.height
          let changedPixels = 0
          if (sameDimensions) for (let index = 0; index < bufferA.length; index += 4) {
            if (bufferA.subarray(index, index + 4).some((value, channel) => value !== bufferB[index + channel])) changedPixels++
          }
          differences.push({ engine, profile, width, beforeHeight: a.height, afterHeight: b.height, sameDimensions, changedPixels: sameDimensions ? changedPixels : null })
        }
      }
    }
  }
}
await writeFile(resolve(root, 'desktop-differences.json'), JSON.stringify(differences, null, 2))
for (const phase of ['before', 'after']) for (const scenario of emailScenarios) {
  const cases = results.filter(row => row.phase === phase && row.scenario === scenario)
  const failures = cases.filter(row => row.scrollWidth > row.requestedWidth + 1 || row.outside.length || row.textOverflow.length || row.imageOverflow.length || row.overlaps.length)
  console.log(JSON.stringify({ phase, scenario, cases: cases.length, failures: failures.length, examples: failures.slice(0, 2) }))
}
console.log(`Comparisons: ${comparisons}`)
if (results.some(row => row.phase === 'after' && (row.scrollWidth > row.requestedWidth + 1 || row.outside.length || row.textOverflow.length || row.imageOverflow.length || row.overlaps.length))
  || differences.some(row => !row.sameDimensions || row.changedPixels !== 0)) process.exitCode = 1
