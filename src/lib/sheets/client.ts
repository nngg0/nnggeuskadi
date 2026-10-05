import 'server-only'
import { createSign } from 'node:crypto'
import { sheetsEnv } from '@/lib/config/env'
import { SHEET_NAMES, type RawWorkbook, type SheetName } from './columns'

/*
 * Cliente mínimo de la API de Google Sheets (solo lectura) mediante una cuenta de servicio.
 * Se implementa con fetch + firma JWT de Node para no añadir la dependencia "googleapis".
 */

export const SHEETS_CACHE_TAG = 'sheets'
const SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'

let cachedToken: { value: string; expiresAt: number } | null = null

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

export function buildServiceAccountJwt(clientEmail: string, privateKey: string, nowSeconds: number): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${signer.sign(privateKey).toString('base64url')}`
}

async function accessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value
  const env = sheetsEnv()
  const assertion = buildServiceAccountJwt(env.clientEmail, env.privateKey, now)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google OAuth respondió ${res.status}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Google OAuth no devolvió access_token')
  cachedToken = { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) }
  return json.access_token
}

interface BatchGetResponse {
  valueRanges?: { range?: string; values?: unknown[][] }[]
}

/** Descarga todas las hojas del contrato en una sola petición. La respuesta se cachea `revalidateSeconds`. */
export async function fetchWorkbook(): Promise<RawWorkbook> {
  const env = sheetsEnv()
  const params = new URLSearchParams({ valueRenderOption: 'FORMATTED_VALUE', majorDimension: 'ROWS' })
  for (const name of SHEET_NAMES) params.append('ranges', `${name}!A1:Z2000`)
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.spreadsheetId)}/values:batchGet?${params}`
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${await accessToken()}` },
    next: { revalidate: env.revalidateSeconds, tags: [SHEETS_CACHE_TAG] },
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status}`)
  const json = (await res.json()) as BatchGetResponse
  const workbook: RawWorkbook = {}
  ;(json.valueRanges ?? []).forEach((range, index) => {
    const name = SHEET_NAMES[index] as SheetName
    workbook[name] = (range.values ?? []).map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
  })
  return workbook
}
