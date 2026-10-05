'use server'

import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { can } from '@/lib/auth/permissions'
import { getContent } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { opportunityAvailability, visibleProjects } from '@/lib/domain/selectors'
import type { ActionResult } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'
import { actionUser, contentIdSchema, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

const inputSchema = z.object({
  projectId: contentIdSchema,
  opportunityIds: z.array(contentIdSchema).min(1, 'Elige al menos un ámbito.').max(20),
})

export async function saveParticipation(projectId: string, opportunityIds: string[]): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'project.participate')) return failure('No tienes permiso para participar.')
  const input = inputSchema.safeParse({ projectId, opportunityIds: [...new Set(opportunityIds)] })
  if (!input.success) return failure(input.error.issues[0]?.message ?? 'Datos no válidos.')

  try {
    const content = await getContent()
    const project = visibleProjects(content.projects).find((p) => p.id === input.data.projectId)
    if (!project) return failure('Este proyecto ya no admite participación.')

    const store = personalStore()
    const [counts, mine] = await Promise.all([store.participationCounts([project.id]), store.myParticipations(user.id)])
    const previous = new Set(mine.find((p) => p.projectId === project.id)?.opportunityIds ?? [])
    const today = madridDate(new Date())

    for (const oppId of input.data.opportunityIds) {
      const opportunity = content.opportunities.find((o) => o.id === oppId && o.projectId === project.id && o.visible)
      if (!opportunity) return failure('Uno de los ámbitos elegidos no existe.')
      // Quien ya estaba apuntado puede conservar su ámbito aunque se haya completado.
      if (previous.has(oppId)) continue
      const availability = opportunityAvailability(opportunity, counts.byOpportunity.get(oppId) ?? 0, today)
      if (!availability.isOpen) return failure(`"${opportunity.name}" ya no admite más personas.`)
    }

    await store.saveParticipation(user.id, {
      projectId: project.id,
      territory: project.territory,
      opportunityIds: input.data.opportunityIds,
    })
    revalidatePath('/', 'layout')
    return success(previous.size > 0 ? 'Hemos actualizado tu participación.' : '¡Gracias! Te contactarán quienes lo están preparando.')
  } catch (error) {
    console.error('[participación]', error)
    return UNEXPECTED
  }
}

export async function withdrawParticipation(projectId: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const id = contentIdSchema.safeParse(projectId)
  if (!id.success) return failure('Proyecto no válido.')
  try {
    await personalStore().withdrawParticipation(user.id, id.data)
    revalidatePath('/', 'layout')
    return success('Has dejado de participar en este proyecto.')
  } catch (error) {
    console.error('[retirar participación]', error)
    return UNEXPECTED
  }
}
