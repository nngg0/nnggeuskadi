import 'server-only'
import { cache } from 'react'
import { contentSource } from '@/lib/config/env'
import type { ContentBundle } from '@/lib/domain/types'
import { fetchWorkbook } from '@/lib/sheets/client'
import { parseWorkbook } from '@/lib/sheets/parse'
import { demoWorkbook } from '@/demo/content'

/**
 * Contenido organizativo (actividades, proyectos, oportunidades, documentos, configuración).
 * Procede del Google Sheet o de los datos demo; en ambos casos pasa por el mismo validador.
 * `cache` evita repetir la carga dentro de una misma petición.
 */
export const getContent = cache(async (): Promise<ContentBundle> => {
  const workbook = contentSource() === 'sheets' ? await fetchWorkbook() : demoWorkbook()
  const content = parseWorkbook(workbook)
  if (content.issues.length > 0) {
    // Las filas inválidas se descartan; se informa en el log del servidor para corregir el Sheet.
    console.warn(
      `[contenido] ${content.issues.length} fila(s) descartadas:\n` +
        content.issues.map((i) => `  ${i.sheet} fila ${i.row}: ${i.message}`).join('\n'),
    )
  }
  return content
})
