import type { InterestId } from './interests'
import type { Territory, TerritoryId } from './territories'

/* ------------------------------------------------------------------ */
/* Contenido organizativo (procede de Google Sheets o de datos demo).  */
/* Nunca contiene datos personales.                                    */
/* ------------------------------------------------------------------ */

export const ACTIVITY_STATUSES = ['confirmada', 'borrador', 'cerrada', 'cancelada'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

export interface Activity {
  id: string
  title: string
  description: string
  territory: TerritoryId
  /** Fecha local de Madrid, YYYY-MM-DD */
  date: string
  /** Hora local de Madrid, HH:MM. Null si no se ha fijado. */
  time: string | null
  place: string
  /** Plazas máximas. Null = sin límite. */
  capacity: number | null
  /** Instantes ISO (UTC). Null = sin restricción. */
  registrationOpensAt: string | null
  registrationClosesAt: string | null
  status: ActivityStatus
  visible: boolean
  featured: boolean
}

export const PROJECT_STATUSES = ['en_preparacion', 'en_marcha', 'cerrado'] as const
export type ProjectStatus = (typeof PROJECT_STATUSES)[number]

export interface Project {
  id: string
  title: string
  description: string
  /** Tipo libre, p. ej. "Campaña", "Formación", "Evento". */
  kind: string | null
  territory: TerritoryId
  status: ProjectStatus
  startDate: string | null
  expectedDate: string | null
  visible: boolean
  featured: boolean
}

/** Participa quien quiera; la organización cierra cada ámbito cuando lo considera. */
export const OPPORTUNITY_STATUSES = ['abierta', 'cerrada'] as const
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number]

export interface Opportunity {
  id: string
  projectId: string
  name: string
  description: string
  deadline: string | null
  status: OpportunityStatus
  visible: boolean
}

export interface DocumentItem {
  id: string
  title: string
  description: string
  category: string
  territory: TerritoryId
  url: string
  date: string | null
  featured: boolean
  visible: boolean
}

export interface AppConfig {
  heroTitle: string
  heroSubtitle: string
  documentCategories: string[]
  /** Proyecto que se muestra como bloque principal en Inicio y Participa (p. ej. la Campaña 29N). */
  featuredProjectId: string | null
  /** Pares clave/valor sin interpretar, para futuras opciones. */
  raw: Record<string, string>
}

export interface ContentIssue {
  sheet: string
  row: number
  message: string
}

export interface ContentBundle {
  activities: Activity[]
  projects: Project[]
  opportunities: Opportunity[]
  documents: DocumentItem[]
  territories: Territory[]
  config: AppConfig
  issues: ContentIssue[]
}

/* ------------------------------------------------------------------ */
/* Datos personales (Supabase). Nunca se escriben en Google Sheets.    */
/* ------------------------------------------------------------------ */

export const USER_ROLES = ['afiliado', 'direccion_euskadi', 'direccion_provincial', 'administracion'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface UserSettings {
  /** Preparado para futuras notificaciones push. */
  notifyNewInitiatives: boolean
}

export interface CurrentUser {
  id: string
  email: string
  displayName: string
  territory: TerritoryId
  role: UserRole
  settings: UserSettings
  /** Hasta 3 temas de interés. */
  interests: InterestId[]
}

export interface Registration {
  eventId: string
  createdAt: string
  /** Respuestas a preguntas adicionales del evento (futuro constructor de formularios). */
  answers: Record<string, unknown>
}

export interface Participation {
  projectId: string
  opportunityIds: string[]
  createdAt: string
}

export interface ManagedPerson {
  displayName: string
  territory: TerritoryId
  createdAt: string
  /** Solo en participaciones: oportunidades elegidas. */
  opportunityIds?: string[]
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }
