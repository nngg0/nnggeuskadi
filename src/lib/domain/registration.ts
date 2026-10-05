import type { Activity } from './types'
import { madridToInstant } from './dates'

export type RegistrationState =
  | { kind: 'cancelled' }
  | { kind: 'past'; wasRegistered: boolean }
  | { kind: 'registered'; canCancel: boolean }
  | { kind: 'closed' }
  | { kind: 'not_open'; opensAt: string }
  | { kind: 'full' }
  | { kind: 'open'; remaining: number | null }

export interface RegistrationContext {
  registeredCount: number
  isRegistered: boolean
  now: Date
}

/** Instante de inicio de la actividad. Sin hora, se considera activa todo el día. */
export function activityStart(activity: Pick<Activity, 'date' | 'time'>): Date {
  return madridToInstant(activity.date, activity.time ?? '23:59')
}

export function isPast(activity: Pick<Activity, 'date' | 'time'>, now: Date): boolean {
  return activityStart(activity).getTime() <= now.getTime()
}

export function remainingSpots(capacity: number | null, registeredCount: number): number | null {
  if (capacity === null) return null
  return Math.max(0, capacity - registeredCount)
}

/**
 * Estado de inscripción de una actividad para un usuario.
 * Es la única fuente de verdad de estas reglas: la usan la interfaz y las acciones de servidor.
 */
export function getRegistrationState(activity: Activity, ctx: RegistrationContext): RegistrationState {
  const { registeredCount, isRegistered, now } = ctx
  if (activity.status === 'cancelada') return { kind: 'cancelled' }
  if (isPast(activity, now)) return { kind: 'past', wasRegistered: isRegistered }
  // El inscrito puede cancelar hasta que empiece la actividad, aunque la inscripción ya esté cerrada.
  if (isRegistered) return { kind: 'registered', canCancel: true }
  if (activity.status === 'cerrada' || activity.status === 'borrador') return { kind: 'closed' }
  if (activity.registrationClosesAt && new Date(activity.registrationClosesAt).getTime() <= now.getTime()) {
    return { kind: 'closed' }
  }
  if (activity.registrationOpensAt && new Date(activity.registrationOpensAt).getTime() > now.getTime()) {
    return { kind: 'not_open', opensAt: activity.registrationOpensAt }
  }
  const remaining = remainingSpots(activity.capacity, registeredCount)
  if (remaining === 0) return { kind: 'full' }
  return { kind: 'open', remaining }
}

export function canRegister(state: RegistrationState): boolean {
  return state.kind === 'open'
}
