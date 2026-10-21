import 'server-only'
import { contentSource } from '@/lib/config/env'
import type { SheetRecord } from '@/lib/domain/new-content'
import { appendSheetRows, deleteSheetRow, fetchSheetFresh, updateSheetCells } from '@/lib/sheets/client'
import type { RawTable } from '@/lib/sheets/columns'
import { changedCells, recordToRow, rowNumberOf } from '@/lib/sheets/rows'
import { addDemoRecords, DEMO_DELETED, withDemoRecords } from '@/demo/content-store'
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
  /** Igual que `update` para varias filas a la vez. Devuelve los ids que no se han encontrado (y no escribe nada si falta alguno). */
  updateMany(sheet: WritableSheet, changes: { id: string; record: SheetRecord }[]): Promise<string[]>
  /** Borra la fila con ese id. Devuelve false si ya no existe. */
  remove(sheet: WritableSheet, id: string): Promise<boolean>
}

async function updateOne(writer: ContentWriter, sheet: WritableSheet, id: string, record: SheetRecord): Promise<boolean> {
  return (await writer.updateMany(sheet, [{ id, record }])).length === 0
}

const sheetsWriter: ContentWriter = {
  read: (sheet) => fetchSheetFresh(sheet),
  async append(sheet, records) {
    const [header] = await fetchSheetFresh(sheet)
    if (!header || header.length === 0) throw new Error(`La hoja ${sheet} no tiene cabeceras`)
    await appendSheetRows(sheet, records.map((r) => recordToRow(header, r)))
  },
  update(sheet, id, record) {
    return updateOne(sheetsWriter, sheet, id, record)
  },
  async updateMany(sheet, changes) {
    // Se relee la hoja justo antes: si alguien ha movido filas en el Sheet, se escribe en la fila correcta.
    const table = await fetchSheetFresh(sheet)
    const [header] = table
    const located = changes.map((c) => ({ ...c, rowNumber: rowNumberOf(table, c.id) }))
    const missing = located.filter((c) => c.rowNumber === null).map((c) => c.id)
    if (!header || missing.length > 0) return header ? missing : changes.map((c) => c.id)
    await updateSheetCells(sheet, located.map((c) => ({ rowNumber: c.rowNumber!, cells: changedCells(header, c.record) })))
    return []
  },
  async remove(sheet, id) {
    // Se localiza la fila justo antes de borrar, por si alguien ha movido filas en el Sheet.
    const rowNumber = rowNumberOf(await fetchSheetFresh(sheet), id)
    if (rowNumber === null) return false
    await deleteSheetRow(sheet, rowNumber)
    return true
  },
}

const demoWriter: ContentWriter = {
  read: async (sheet) => (await withDemoRecords(demoWorkbook()))[sheet] ?? [],
  append: (sheet, records) => addDemoRecords(sheet, records),
  update(sheet, id, record) {
    return updateOne(demoWriter, sheet, id, record)
  },
  async updateMany(sheet, changes) {
    const table = (await withDemoRecords(demoWorkbook()))[sheet]
    const missing = changes.filter((c) => rowNumberOf(table, c.id) === null).map((c) => c.id)
    if (missing.length > 0) return missing
    await addDemoRecords(sheet, changes.map((c) => ({ ...c.record, id: c.id })))
    return []
  },
  async remove(sheet, id) {
    const table = (await withDemoRecords(demoWorkbook()))[sheet]
    if (rowNumberOf(table, id) === null) return false
    await addDemoRecords(sheet, [{ id, [DEMO_DELETED]: 'sí' }])
    return true
  },
}

export function contentWriter(): ContentWriter {
  return contentSource() === 'sheets' ? sheetsWriter : demoWriter
}
