import 'server-only'
import { getRegistrationState, type RegistrationState } from '@/lib/domain/registration'
import type { Activity } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'

export interface ActivityView {
  activity: Activity
  registeredCount: number
  isRegistered: boolean
  state: RegistrationState
}

/** Combina contenido (Sheet) y datos personales (BD) para pintar actividades. */
export async function activityViews(activities: Activity[], userId: string, now = new Date()): Promise<ActivityView[]> {
  const store = personalStore()
  const [counts, mine] = await Promise.all([
    store.registrationCounts(activities.map((a) => a.id)),
    store.myRegistrations(userId),
  ])
  const myIds = new Set(mine.map((r) => r.eventId))
  return activities.map((activity) => {
    const registeredCount = counts.get(activity.id) ?? 0
    const isRegistered = myIds.has(activity.id)
    return {
      activity,
      registeredCount,
      isRegistered,
      state: getRegistrationState(activity, { registeredCount, isRegistered, now }),
    }
  })
}
