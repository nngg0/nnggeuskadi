import 'server-only'
import { cache } from 'react'
import { contentSource } from '@/lib/config/env'
import { canSeeActivity } from '@/lib/auth/permissions'
import type { ContentBundle, CurrentUser } from '@/lib/domain/types'
import { fetchWorkbook } from '@/lib/sheets/client'
import { parseWorkbook } from '@/lib/sheets/parse'
import { demoWorkbook } from '@/demo/content'
import { withDemoRecords } from '@/demo/content-store'

/**
 * Contenido organizativo (actividades, proyectos, oportunidades, documentos, configuración).
 * Procede del Google Sheet o de los datos demo; en ambos casos pasa por el mismo validador.
 * `cache` evita repetir la carga dentro de una misma petición.
 */
export const getContent = cache(async (): Promise<ContentBundle> => {
  const workbook = contentSource() === 'sheets' ? await fetchWorkbook() : await withDemoRecords(demoWorkbook())
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

/**
 * Contenido tal y como lo puede ver esta persona: sin las juntas cerradas si no es de la Junta Directiva.
 * Usar siempre esta versión en páginas y acciones que muestran o actúan sobre actos.
 */
export async function getContentFor(user: Pick<CurrentUser, 'role' | 'territory' | 'junta'>): Promise<ContentBundle> {
  const content = await getContent()
  return { ...content, activities: content.activities.filter((a) => canSeeActivity(user, a)) }
}
