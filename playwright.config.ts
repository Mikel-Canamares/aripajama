import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  timeout: 35_000,
  expect: { timeout: 10_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'mobile-chromium', use: { ...devices['iPhone 13'], browserName: 'chromium' } },
    { name: 'mobile-webkit', use: { ...devices['iPhone 13'], browserName: 'webkit' } },
  ],
  webServer: [{
    command: 'npm run dev -- --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: !process.env.CI,
  }, {
    command: 'npm run dev:api:test',
    url: 'http://127.0.0.1:8787/api/trip-config',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  }, {
    command: 'npm run emails:preview',
    url: 'http://127.0.0.1:4321',
    reuseExistingServer: !process.env.CI,
  }],
})
