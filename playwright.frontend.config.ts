import { defineConfig } from '@playwright/test'
import config from './playwright.config'

// Screens and local navigation can be checked without the API or email service.
export default defineConfig({
  ...config,
  testIgnore: ['**/api-local.spec.ts', '**/trip-request.spec.ts', '**/emails.spec.ts'],
  webServer: [{
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  }],
})
