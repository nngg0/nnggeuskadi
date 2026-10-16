import 'server-only'
import { contentSource } from '@/lib/config/env'
import type { SheetRecord } from '@/lib/domain/new-content'
import { appendSheetRows, fetchSheetFresh } from '@/lib/sheets/client'
import type { RawTable } from '@/lib/sheets/columns'
import { recordToRow } from '@/lib/sheets/rows'
import { addDemoRecords, withDemoRecords } from '@/demo/content-store'
import { demoWorkbook } from '@/demo/content'

/**
 * Escritura de contenido organizativo: filas nuevas en ACTIVIDADES, PROYECTOS y OPORTUNIDADES.
 * Nunca escribe datos personales. El permiso se comprueba antes, en la Server Action.
 */
export type WritableSheet = 'ACTIVIDADES' | 'PROYECTOS' | 'OPORTUNIDADES'

export interface ContentWriter {
  /** Hoja actual, sin caché (cabeceras + filas), para calcular ids libres. */
  read(sheet: WritableSheet): Promise<RawTable>
  append(sheet: WritableSheet, records: SheetRecord[]): Promise<void>
}

const sheetsWriter: ContentWriter = {
  read: (sheet) => fetchSheetFresh(sheet),
  async append(sheet, records) {
    const [header] = await fetchSheetFresh(sheet)
    if (!header || header.length === 0) throw new Error(`La hoja ${sheet} no tiene cabeceras`)
    await appendSheetRows(sheet, records.map((r) => recordToRow(header, r)))
  },
}

const demoWriter: ContentWriter = {
  read: async (sheet) => (await withDemoRecords(demoWorkbook()))[sheet] ?? [],
  append: (sheet, records) => addDemoRecords(sheet, records),
}

export function contentWriter(): ContentWriter {
  return contentSource() === 'sheets' ? sheetsWriter : demoWriter
}
