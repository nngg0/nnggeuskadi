import 'server-only'
import { cookies } from 'next/headers'
import { z } from 'zod'
import type { SheetRecord } from '@/lib/domain/new-content'
import type { RawWorkbook, SheetName } from '@/lib/sheets/columns'
import { recordToRow } from '@/lib/sheets/rows'

/*
 * DATOS DEMO — filas creadas desde la web («+» en Calendario y Participa) sin Google Sheets.
 * Se guardan en una cookie del navegador y se suman al libro demo antes de validarlo, así que
 * pasan por el mismo validador que las filas reales. Solo se conservan las últimas (límite de tamaño de cookie).
 */

const COOKIE = 'nngg_demo_content'
const MAX_COOKIE_CHARS = 3200
const MAX_DEMO_TEXT = 400
const WRITABLE = ['ACTIVIDADES', 'PROYECTOS', 'OPORTUNIDADES'] as const satisfies readonly SheetName[]

const entriesSchema = z
  .array(z.object({ s: z.enum(WRITABLE), r: z.record(z.string().max(40), z.string().max(MAX_DEMO_TEXT)) }))
  .max(60)
type Entries = z.infer<typeof entriesSchema>

async function readEntries(): Promise<Entries> {
  const raw = (await cookies()).get(COOKIE)?.value
  if (!raw) return []
  try {
    const parsed = entriesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

export async function addDemoRecords(sheet: (typeof WRITABLE)[number], records: SheetRecord[]): Promise<void> {
  const entries = await readEntries()
  for (const record of records) {
    entries.push({ s: sheet, r: Object.fromEntries(Object.entries(record).map(([k, v]) => [k, v.slice(0, MAX_DEMO_TEXT)])) })
  }
  while (entries.length > 1 && JSON.stringify(entries).length > MAX_COOKIE_CHARS) entries.shift()
  ;(await cookies()).set(COOKIE, JSON.stringify(entries), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
}

/** Libro demo con las filas creadas en este navegador añadidas al final de cada hoja. */
export async function withDemoRecords(workbook: RawWorkbook): Promise<RawWorkbook> {
  const entries = await readEntries()
  if (entries.length === 0) return workbook
  const result: RawWorkbook = { ...workbook }
  for (const { s, r } of entries) {
    const table = result[s]
    if (!table?.[0]) continue
    try {
      result[s] = [...table, recordToRow(table[0], r)]
    } catch {
      // fila de una versión anterior de la demo: se ignora
    }
  }
  return result
}
