'use server'

import { revalidatePath } from 'next/cache'
import { can } from '@/lib/auth/permissions'
import { getContent } from '@/lib/content/source'
import { getRegistrationState } from '@/lib/domain/registration'
import { publicActivities } from '@/lib/domain/selectors'
import type { ActionResult } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'
import { actionUser, contentIdSchema, failure, NOT_AUTHENTICATED, success, UNEXPECTED } from './helpers'

const STATE_MESSAGES: Record<string, string> = {
  cancelled: 'Esta actividad se ha cancelado.',
  past: 'Esta actividad ya se ha celebrado.',
  registered: 'Ya estás inscrito en esta actividad.',
  closed: 'La inscripción está cerrada.',
  not_open: 'La inscripción todavía no está abierta.',
  full: 'No quedan plazas disponibles.',
}

export async function registerForActivity(activityId: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  if (!can(user, 'activity.register')) return failure('No tienes permiso para inscribirte.')
  const id = contentIdSchema.safeParse(activityId)
  if (!id.success) return failure('Actividad no válida.')

  try {
    const content = await getContent()
    const activity = publicActivities(content.activities).find((a) => a.id === id.data)
    if (!activity) return failure('Esta actividad ya no está disponible.')

    const store = personalStore()
    const [counts, mine] = await Promise.all([store.registrationCounts([activity.id]), store.myRegistrations(user.id)])
    const state = getRegistrationState(activity, {
      registeredCount: counts.get(activity.id) ?? 0,
      isRegistered: mine.some((r) => r.eventId === activity.id),
      now: new Date(),
    })
    if (state.kind !== 'open') return failure(STATE_MESSAGES[state.kind] ?? 'No es posible inscribirse.')

    const outcome = await store.register(user.id, {
      eventId: activity.id,
      territory: activity.territory,
      capacity: activity.capacity,
    })
    revalidatePath('/', 'layout')
    if (outcome === 'full') return failure('Se acaban de completar las plazas. Lo sentimos.')
    if (outcome === 'already') return success('Ya estabas inscrito.')
    return success('¡Inscripción confirmada!')
  } catch (error) {
    console.error('[inscripción]', error)
    return UNEXPECTED
  }
}

export async function cancelRegistration(activityId: string): Promise<ActionResult> {
  const user = await actionUser()
  if (!user) return NOT_AUTHENTICATED
  const id = contentIdSchema.safeParse(activityId)
  if (!id.success) return failure('Actividad no válida.')

  try {
    const content = await getContent()
    const activity = content.activities.find((a) => a.id === id.data)
    if (activity) {
      const state = getRegistrationState(activity, { registeredCount: 0, isRegistered: true, now: new Date() })
      if (state.kind === 'past') return failure('La actividad ya se ha celebrado.')
    }
    await personalStore().cancelRegistration(user.id, id.data)
    revalidatePath('/', 'layout')
    return success('Inscripción cancelada.')
  } catch (error) {
    console.error('[cancelación]', error)
    return UNEXPECTED
  }
}
