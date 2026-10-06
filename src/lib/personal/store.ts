import type { TerritoryId } from '@/lib/domain/territories'
import type { InterestId } from '@/lib/domain/interests'
import type { ManagedPerson, Participation, Registration, UserSettings } from '@/lib/domain/types'

/**
 * Acceso a los datos personales (inscripciones, participaciones, documentos guardados, perfil).
 * Implementaciones: Supabase (producción) y demo (cookie, sin servicios externos).
 *
 * Las comprobaciones de negocio (plazos, visibilidad, plazas) se hacen en las acciones de servidor
 * antes de llamar aquí; además, la implementación Supabase las refuerza en base de datos
 * (restricciones únicas, bloqueo de plazas y RLS).
 */
export type RegisterOutcome = 'ok' | 'already' | 'full'

export interface EventRegistrationInput {
  eventId: string
  territory: TerritoryId
  capacity: number | null
  answers?: Record<string, unknown>
}

export interface ParticipationInput {
  projectId: string
  territory: TerritoryId
  opportunityIds: string[]
}

export interface PersonalStore {
  /* Agregados: los ve cualquier afiliado; nunca incluyen nombres. */
  registrationCounts(eventIds: string[]): Promise<Map<string, number>>
  participationCounts(projectIds: string[]): Promise<{ byOpportunity: Map<string, number>; byProject: Map<string, number> }>

  /* Datos propios del usuario autenticado. */
  myRegistrations(userId: string): Promise<Registration[]>
  register(userId: string, input: EventRegistrationInput): Promise<RegisterOutcome>
  cancelRegistration(userId: string, eventId: string): Promise<void>

  myParticipations(userId: string): Promise<Participation[]>
  saveParticipation(userId: string, input: ParticipationInput): Promise<void>
  withdrawParticipation(userId: string, projectId: string): Promise<void>

  savedDocumentIds(userId: string): Promise<string[]>
  setDocumentSaved(userId: string, documentId: string, saved: boolean): Promise<void>

  updateProfile(userId: string, input: { displayName: string; settings: UserSettings }): Promise<void>
  updateInterests(userId: string, interests: InterestId[]): Promise<void>

  /* Gestión: solo dirección con permiso sobre el territorio (verificado también en base de datos). */
  eventRegistrants(eventId: string): Promise<ManagedPerson[]>
  projectParticipants(projectId: string): Promise<ManagedPerson[]>
}
