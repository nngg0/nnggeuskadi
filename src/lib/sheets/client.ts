import 'server-only'
import { createSign } from 'node:crypto'
import { sheetsEnv } from '@/lib/config/env'
import { SHEET_NAMES, type RawTable, type RawWorkbook, type SheetName } from './columns'

/*
 * Cliente mínimo de la API de Google Sheets mediante una cuenta de servicio.
 * Se implementa con fetch + firma JWT de Node para no añadir la dependencia "googleapis".
 * La lectura usa un token de solo lectura; el permiso de escritura solo se pide al añadir filas
 * (alta de actividades y proyectos desde la web).
 */

export const SHEETS_CACHE_TAG = 'sheets'
export const READ_SCOPE = 'https://www.googleapis.com/auth/spreadsheets.readonly'
export const WRITE_SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
type Scope = typeof READ_SCOPE | typeof WRITE_SCOPE
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API = 'https://sheets.googleapis.com/v4/spreadsheets'

const cachedTokens = new Map<Scope, { value: string; expiresAt: number }>()

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString('base64url')
}

export function buildServiceAccountJwt(
  clientEmail: string,
  privateKey: string,
  nowSeconds: number,
  scope: Scope = READ_SCOPE,
): string {
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = base64url(
    JSON.stringify({ iss: clientEmail, scope, aud: TOKEN_URL, iat: nowSeconds, exp: nowSeconds + 3600 }),
  )
  const signer = createSign('RSA-SHA256')
  signer.update(`${header}.${claims}`)
  return `${header}.${claims}.${signer.sign(privateKey).toString('base64url')}`
}

async function accessToken(scope: Scope = READ_SCOPE): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const cachedToken = cachedTokens.get(scope)
  if (cachedToken && cachedToken.expiresAt - 60 > now) return cachedToken.value
  const env = sheetsEnv()
  const assertion = buildServiceAccountJwt(env.clientEmail, env.privateKey, now, scope)
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google OAuth respondió ${res.status}`)
  const json = (await res.json()) as { access_token?: string; expires_in?: number }
  if (!json.access_token) throw new Error('Google OAuth no devolvió access_token')
  cachedTokens.set(scope, { value: json.access_token, expiresAt: now + (json.expires_in ?? 3600) })
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
  const url = `${API}/${encodeURIComponent(env.spreadsheetId)}/values:batchGet?${params}`
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${await accessToken()}` },
    next: { revalidate: env.revalidateSeconds, tags: [SHEETS_CACHE_TAG] },
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status}`)
  const json = (await res.json()) as BatchGetResponse
  const workbook: RawWorkbook = {}
  ;(json.valueRanges ?? []).forEach((range, index) => {
    const name = SHEET_NAMES[index] as SheetName
    workbook[name] = toTable(range.values)
  })
  return workbook
}

function toTable(values: unknown[][] | undefined): RawTable {
  return (values ?? []).map((row) => row.map((cell) => (cell == null ? '' : String(cell))))
}

/** Lee una hoja sin caché (antes de escribir, para conocer cabeceras e ids actuales). */
export async function fetchSheetFresh(sheet: SheetName): Promise<RawTable> {
  const env = sheetsEnv()
  const range = encodeURIComponent(`${sheet}!A1:Z2000`)
  const res = await fetch(`${API}/${encodeURIComponent(env.spreadsheetId)}/values/${range}?valueRenderOption=FORMATTED_VALUE`, {
    headers: { authorization: `Bearer ${await accessToken(WRITE_SCOPE)}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status} al leer ${sheet}`)
  return toTable(((await res.json()) as { values?: unknown[][] }).values)
}

/**
 * Añade filas al final de una hoja. valueInputOption=RAW guarda el texto tal cual:
 * nada de lo que escriba un usuario se interpreta como fórmula ni se reformatea.
 */
export async function appendSheetRows(sheet: SheetName, rows: string[][]): Promise<void> {
  if (rows.length === 0) return
  const env = sheetsEnv()
  const range = encodeURIComponent(`${sheet}!A1`)
  const params = new URLSearchParams({ valueInputOption: 'RAW', insertDataOption: 'INSERT_ROWS' })
  const res = await fetch(`${API}/${encodeURIComponent(env.spreadsheetId)}/values/${range}:append?${params}`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(WRITE_SCOPE)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ majorDimension: 'ROWS', values: rows }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status} al escribir en ${sheet}`)
}

/** Letra de columna A1 (0 → A, 25 → Z, 26 → AA). */
export function columnLetter(index: number): string {
  let n = index + 1
  let letters = ''
  while (n > 0) {
    const rem = (n - 1) % 26
    letters = String.fromCharCode(65 + rem) + letters
    n = Math.floor((n - 1) / 26)
  }
  return letters
}

/**
 * Escribe solo las celdas indicadas de una o varias filas (índice de columna → valor), en una sola petición y sin tocar el resto:
 * así se conservan fórmulas, formatos y columnas que el formulario no edita. RAW: texto tal cual.
 */
export async function updateSheetCells(sheet: SheetName, rows: { rowNumber: number; cells: Map<number, string> }[]): Promise<void> {
  if (rows.some((r) => r.rowNumber < 2)) throw new Error('No se pueden sobrescribir las cabeceras')
  const data = rows.flatMap(({ rowNumber, cells }) =>
    [...cells].map(([col, value]) => ({ range: `${sheet}!${columnLetter(col)}${rowNumber}`, values: [[value]] })),
  )
  if (data.length === 0) return
  const env = sheetsEnv()
  const res = await fetch(`${API}/${encodeURIComponent(env.spreadsheetId)}/values:batchUpdate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(WRITE_SCOPE)}`, 'content-type': 'application/json' },
    body: JSON.stringify({ valueInputOption: 'RAW', data }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status} al actualizar ${sheet}`)
}

/** Id numérico de una pestaña (lo necesita la API para borrar filas). */
async function sheetIdOf(sheet: SheetName): Promise<number> {
  const env = sheetsEnv()
  const res = await fetch(`${API}/${encodeURIComponent(env.spreadsheetId)}?fields=sheets.properties(sheetId,title)`, {
    headers: { authorization: `Bearer ${await accessToken(WRITE_SCOPE)}` },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status} al leer las pestañas`)
  const json = (await res.json()) as { sheets?: { properties?: { sheetId?: number; title?: string } }[] }
  const found = json.sheets?.find((s) => s.properties?.title === sheet)?.properties?.sheetId
  if (found === undefined) throw new Error(`No existe la pestaña ${sheet}`)
  return found
}

/** Borra una fila entera (número de fila del Sheet, 1 = cabeceras). */
export async function deleteSheetRow(sheet: SheetName, rowNumber: number): Promise<void> {
  if (rowNumber < 2) throw new Error('No se pueden borrar las cabeceras')
  const env = sheetsEnv()
  const sheetId = await sheetIdOf(sheet)
  const res = await fetch(`${API}/${encodeURIComponent(env.spreadsheetId)}:batchUpdate`, {
    method: 'POST',
    headers: { authorization: `Bearer ${await accessToken(WRITE_SCOPE)}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      requests: [{ deleteDimension: { range: { sheetId, dimension: 'ROWS', startIndex: rowNumber - 1, endIndex: rowNumber } } }],
    }),
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Google Sheets respondió ${res.status} al borrar en ${sheet}`)
}
