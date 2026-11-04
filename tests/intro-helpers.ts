import type { Page } from '@playwright/test'

export async function openIntroWithMediaError(page: Page) {
  await page.goto('/')
  // WebKit's native media requests can bypass Playwright routing.
  await page.locator('.intro__film').evaluate(media => {
    if (media instanceof HTMLVideoElement) {
      media.src = 'data:video/mp4;base64,AAAA'
      media.load()
    }
  })
}
