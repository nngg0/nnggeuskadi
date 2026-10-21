import type { SheetRecord } from '@/lib/domain/new-content'
import { normalizeHeader } from './parse'
import type { RawTable } from './columns'

/**
 * Coloca los valores de una fila nueva bajo sus cabeceras. El orden de las columnas del Sheet es libre,
 * así que se usa la fila 1 real. Si falta una columna con valor, se rechaza: escribir la fila descolocada
 * la haría inválida (o, peor, la publicaría con otro significado).
 */
export function recordToRow(header: string[], record: SheetRecord): string[] {
  const keys = header.map((h) => normalizeHeader(String(h ?? '')))
  const missing = Object.entries(record)
    .filter(([key, value]) => value !== '' && !keys.includes(key))
    .map(([key]) => key)
  if (missing.length > 0) throw new Error(`Faltan columnas en el Sheet: ${missing.join(', ')}`)
  return keys.map((key) => record[key] ?? '')
}

/** Valores de la columna `id` de una tabla cruda (sin la cabecera). */
export function idsOf(table: RawTable | undefined): string[] {
  if (!table || table.length === 0) return []
  const [header = [], ...rows] = table
  const index = header.map((h) => normalizeHeader(String(h ?? ''))).indexOf('id')
  if (index < 0) return []
  return rows.map((r) => String(r[index] ?? '').trim()).filter(Boolean)
}

/**
 * Fila existente con los valores nuevos encima: las columnas que no vienen en `record` se conservan.
 * Igual que en el alta, si falta una columna con valor no se escribe nada.
 */
export function mergeRow(header: string[], existing: string[], record: SheetRecord): string[] {
  const updated = recordToRow(header, record)
  const keys = new Set(Object.keys(record))
  return header.map((h, i) => (keys.has(normalizeHeader(String(h ?? ''))) ? updated[i]! : String(existing[i] ?? '')))
}

/** Celdas que cambia `record` en una fila: índice de columna → valor. Rechaza si falta una columna con valor. */
export function changedCells(header: string[], record: SheetRecord): Map<number, string> {
  const row = recordToRow(header, record)
  const keys = new Set(Object.keys(record))
  const cells = new Map<number, string>()
  header.forEach((h, i) => {
    if (keys.has(normalizeHeader(String(h ?? '')))) cells.set(i, row[i]!)
  })
  return cells
}

/** Número de fila del Sheet (1 = cabeceras) de la fila con ese id, o null. */
export function rowNumberOf(table: RawTable | undefined, id: string): number | null {
  if (!table || table.length === 0) return null
  const [header = [], ...rows] = table
  const index = header.map((h) => normalizeHeader(String(h ?? ''))).indexOf('id')
  if (index < 0) return null
  const found = rows.findIndex((r) => String(r[index] ?? '').trim() === id)
  return found < 0 ? null : found + 2
}
