import { defineConfig, devices } from '@playwright/test'
import { existsSync } from 'node:fs'

/*
 * Pruebas de extremo a extremo en modo demo (sin servicios externos).
 * Arrancan la build de producción en el puerto 3200.
 */
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:3200',
    trace: 'retain-on-failure',
    launchOptions: { executablePath },
  },
  projects: [
    { name: 'movil', use: { ...devices['Pixel 7'], launchOptions: { executablePath } } },
    { name: 'escritorio', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 }, launchOptions: { executablePath } } },
  ],
  webServer: {
    command: 'npm run build && npm run start -- -p 3200',
    url: 'http://localhost:3200/login',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
    env: { NEXT_PUBLIC_APP_MODE: 'demo' },
  },
})
