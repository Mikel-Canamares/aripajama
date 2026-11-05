import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: 'emails.spec.ts',
  outputDir: 'test-results/emails',
  fullyParallel: true,
  workers: 2,
  timeout: 120_000,
  reporter: 'list',
  metadata: { emailPreviewUrl: 'http://127.0.0.1:4322' },
  use: { trace: 'retain-on-failure' },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], deviceScaleFactor: 1, browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], deviceScaleFactor: 1, browserName: 'webkit' } },
  ],
  webServer: {
    command: 'node --experimental-strip-types scripts/preview-emails.ts --port=4322',
    url: 'http://127.0.0.1:4322',
    reuseExistingServer: false,
  },
})
