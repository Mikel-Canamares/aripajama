import type { Page } from '@playwright/test'

export const emailWidths = [280, 320, 360, 375, 390, 430, 600, 640, 1024]
export const emailScenarios = ['normal', 'no-media', 'no-head-css', 'blocked-assets'] as const
export type EmailScenario = typeof emailScenarios[number]

export async function applyEmailScenario(page: Page, scenario: EmailScenario) {
  if (scenario === 'no-head-css') {
    await page.locator('head style').evaluateAll(nodes => nodes.forEach(node => node.remove()))
  } else if (scenario === 'no-media') {
    await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        for (let index = sheet.cssRules.length - 1; index >= 0; index--) {
          if (sheet.cssRules[index].type === CSSRule.MEDIA_RULE) sheet.deleteRule(index)
        }
      }
    })
  }
}

export async function measureEmail(page: Page, requestedWidth: number) {
  return page.evaluate(width => {
    const tolerance = 1
    const label = (node: Element) => `${node.tagName}.${node.className}: ${node.getAttribute('alt') || node.textContent?.trim().slice(0, 65) || ''}`
    const visible = (node: Element) => {
      const rect = node.getBoundingClientRect()
      return rect.width > 0 && rect.height > 0
    }
    const nodes = [...document.querySelectorAll('table,td,img,h1,h2,h3,p,span')].filter(visible)
    const outside = nodes.filter(node => {
      const rect = node.getBoundingClientRect()
      return rect.left < -tolerance || rect.right > width + tolerance
    }).map(label)
    const copy = [...document.querySelectorAll('h1,h2,h3,p,.tagline,.farewell')].filter(visible)
    const textOverflow = copy.filter(node => {
      const range = document.createRange()
      range.selectNodeContents(node)
      const bounds = node.getBoundingClientRect()
      return [...range.getClientRects()].some(rect => rect.left < bounds.left - tolerance || rect.right > bounds.right + tolerance)
        || (['hidden', 'clip'].includes(getComputedStyle(node).overflowY) && node.scrollHeight > node.clientHeight + tolerance)
    }).map(label)
    const imageOverflow = [...document.querySelectorAll('img')].filter(visible).filter(node => {
      const rect = node.getBoundingClientRect()
      const cell = node.closest('td')!.getBoundingClientRect()
      return rect.left < cell.left - tolerance || rect.right > cell.right + tolerance
    }).map(label)
    const elements = [...copy, ...document.querySelectorAll('img')].filter(visible)
    const overlaps: string[] = []
    for (let a = 0; a < elements.length; a++) {
      for (let b = a + 1; b < elements.length; b++) {
        const left = elements[a], right = elements[b]
        if (left.contains(right) || right.contains(left)) continue
        const x = left.getBoundingClientRect(), y = right.getBoundingClientRect()
        if (Math.min(x.right, y.right) - Math.max(x.left, y.left) > tolerance
          && Math.min(x.bottom, y.bottom) - Math.max(x.top, y.top) > tolerance) {
          overlaps.push(`${label(left)} / ${label(right)}`)
        }
      }
    }
    return {
      requestedWidth: width,
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      outside, textOverflow, imageOverflow, overlaps,
    }
  }, requestedWidth)
}
