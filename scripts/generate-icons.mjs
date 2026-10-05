/**
 * Genera los iconos de la PWA a partir del logotipo oficial en blanco
 * (public/brand/nngg-euskadi-blanco.png) sobre el azul de la marca.
 * Uso: npm run icons
 * Si Playwright no encuentra su navegador, define PLAYWRIGHT_CHROMIUM_PATH con la ruta de Chromium.
 */
import { chromium } from '@playwright/test'
import { readFile, writeFile } from 'node:fs/promises'
import { existsSync } from 'node:fs'

const BRAND_BLUE = '#1e4b8f'
const logo = `data:image/png;base64,${(await readFile('public/brand/nngg-euskadi-blanco.png')).toString('base64')}`
const executablePath =
  process.env.PLAYWRIGHT_CHROMIUM_PATH || (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined)

// scale = ancho del logo respecto al lado del icono.
const targets = [
  { file: 'favicon-32.png', size: 32, scale: 0.84 },
  { file: 'icon-192.png', size: 192, scale: 0.7 },
  { file: 'icon-512.png', size: 512, scale: 0.7 },
  { file: 'apple-touch-icon.png', size: 180, scale: 0.66 },
  // Maskable: el sistema recorta hasta un 20 %, la marca debe quedar dentro de la zona segura.
  { file: 'icon-maskable-512.png', size: 512, scale: 0.5 },
]

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage()
for (const t of targets) {
  await page.setViewportSize({ width: t.size, height: t.size })
  await page.setContent(
    `<html><body style="margin:0;background:${BRAND_BLUE};display:grid;place-items:center;width:${t.size}px;height:${t.size}px">
      <img src="${logo}" style="width:${Math.round(t.size * t.scale)}px;height:auto">
    </body></html>`,
  )
  await writeFile(`public/icons/${t.file}`, await page.screenshot({ type: 'png' }))
  console.log('✓', t.file)
}
await browser.close()
