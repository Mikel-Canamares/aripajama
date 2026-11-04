import { defineConfig } from '@playwright/test'
import config from './playwright.config'

// Library navigation and local assets do not require the request API or emails.
export default defineConfig({
  ...config,
  testMatch: /(?:catalog|library|trip-detail|library-trips)\.spec\.ts/,
  webServer: [{
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  }],
})
