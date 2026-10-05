/**
 * Genera los iconos PNG de la PWA a partir de public/icons/icon.svg usando Chromium (Playwright).
 * Uso: npm run icons
 * Si Playwright no encuentra su navegador, define PLAYWRIGHT_CHROMIUM_PATH con la ruta de Chromium.
 */
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const svg = await readFile('public/icons/icon.svg', 'utf8')
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

const targets = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'apple-touch-icon.png', size: 180, padding: 0 },
  // Maskable: el sistema recorta hasta un 20 %, se reduce la marca para que quede en la zona segura.
  { file: 'icon-maskable-512.png', size: 512, padding: 0.12 },
]

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()
for (const t of targets) {
  const inner = Math.round(t.size * (1 - t.padding * 2))
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(
    `<html><body style="margin:0;background:#071330;display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
      <div style="width:${inner}px;height:${inner}px">${svg.replace('<svg ', `<svg width="${inner}" height="${inner}" `)}</div>
    </body></html>`,
  )
  await writeFile(`public/icons/${t.file}`, await page.screenshot({ type: 'png' }))
  console.log('✓', t.file)
}
await browser.close()
