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
