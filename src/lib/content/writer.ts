import 'server-only'
import { contentSource } from '@/lib/config/env'
import type { SheetRecord } from '@/lib/domain/new-content'
import { appendSheetRows, fetchSheetFresh, updateSheetCells } from '@/lib/sheets/client'
import type { RawTable } from '@/lib/sheets/columns'
import { changedCells, recordToRow, rowNumberOf } from '@/lib/sheets/rows'
import { addDemoRecords, withDemoRecords } from '@/demo/content-store'
import { demoWorkbook } from '@/demo/content'

/**
 * Escritura de contenido organizativo: filas nuevas en ACTIVIDADES, PROYECTOS y OPORTUNIDADES,
 * y edición de una fila existente (actos).
 * Nunca escribe datos personales. El permiso se comprueba antes, en la Server Action.
 */
export type WritableSheet = 'ACTIVIDADES' | 'PROYECTOS' | 'OPORTUNIDADES'

export interface ContentWriter {
  /** Hoja actual, sin caché (cabeceras + filas), para calcular ids libres. */
  read(sheet: WritableSheet): Promise<RawTable>
  append(sheet: WritableSheet, records: SheetRecord[]): Promise<void>
  /** Cambia las columnas de `record` en la fila con ese id. Devuelve false si la fila ya no existe. */
  update(sheet: WritableSheet, id: string, record: SheetRecord): Promise<boolean>
}

const sheetsWriter: ContentWriter = {
  read: (sheet) => fetchSheetFresh(sheet),
  async append(sheet, records) {
    const [header] = await fetchSheetFresh(sheet)
    if (!header || header.length === 0) throw new Error(`La hoja ${sheet} no tiene cabeceras`)
    await appendSheetRows(sheet, records.map((r) => recordToRow(header, r)))
  },
  async update(sheet, id, record) {
    // Se relee la hoja justo antes: si alguien ha movido filas en el Sheet, se escribe en la fila correcta.
    const table = await fetchSheetFresh(sheet)
    const [header] = table
    const rowNumber = rowNumberOf(table, id)
    if (!header || rowNumber === null) return false
    await updateSheetCells(sheet, rowNumber, changedCells(header, record))
    return true
  },
}

const demoWriter: ContentWriter = {
  read: async (sheet) => (await withDemoRecords(demoWorkbook()))[sheet] ?? [],
  append: (sheet, records) => addDemoRecords(sheet, records),
  async update(sheet, id, record) {
    const table = (await withDemoRecords(demoWorkbook()))[sheet]
    if (rowNumberOf(table, id) === null) return false
    await addDemoRecords(sheet, [{ ...record, id }])
    return true
  },
}

export function contentWriter(): ContentWriter {
  return contentSource() === 'sheets' ? sheetsWriter : demoWriter
}
