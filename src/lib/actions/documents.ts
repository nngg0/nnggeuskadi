'use server'

import { revalidatePath } from 'next/cache'
import { can } from '@/lib/auth/permissions'
import { getContent } from '@/lib/content/source'
import type { ActionResult } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'
import { actionUser, contentIdSchema, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

export async function setDocumentSaved(documentId: string, saved: boolean): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'document.save')) return failure('No tienes permiso para guardar documentos.')
  const id = contentIdSchema.safeParse(documentId)
  if (!id.success || typeof saved !== 'boolean') return failure('Documento no válido.')
  try {
    if (saved) {
      const content = await getContent()
      if (!content.documents.some((d) => d.id === id.data && d.visible)) return failure('Este documento ya no está disponible.')
    }
    await personalStore().setDocumentSaved(user.id, id.data, saved)
    revalidatePath('/documentos')
    revalidatePath('/perfil')
    return success(saved ? 'Guardado en tu perfil.' : 'Quitado de guardados.')
  } catch (error) {
    console.error('[documento guardado]', error)
    return UNEXPECTED
  }
}
