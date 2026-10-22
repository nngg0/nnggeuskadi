import type { InterestId } from './interests'
import type { Territory, TerritoryId } from './territories'

/* ------------------------------------------------------------------ */
/* Contenido organizativo (procede de Google Sheets o de datos demo).  */
/* Nunca contiene datos personales.                                    */
/* ------------------------------------------------------------------ */

export const ACTIVITY_STATUSES = ['confirmada', 'borrador', 'cerrada', 'cancelada'] as const
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number]

/** «junta»: acto interno de NNGG (junta directiva), en otro color. */
export const ACTIVITY_KINDS = ['acto', 'junta'] as const
export type ActivityKind = (typeof ACTIVITY_KINDS)[number]
/** Solo aplica a juntas: abierta a todos los afiliados o cerrada (solo miembros de la Junta Directiva). */
export const ACTIVITY_ACCESS = ['abierto', 'cerrado'] as const
export type ActivityAccess = (typeof ACTIVITY_ACCESS)[number]

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
  kind: ActivityKind
  access: ActivityAccess
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
  /** Periodo de campaña (en rojo en el calendario). Null = por defecto, los 15 días antes del día de reflexión. */
  campaignStart: string | null
  campaignEnd: string | null
  /** Lema grande del bloque de campaña (p. ej. «POR FIN»). Null = sin lema. */
  campaignSlogan: string | null
  /** Imagen del bloque de campaña: ruta de la app (/campana/…) o URL https. Null = sin imagen. */
  campaignImage: string | null
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
  /** Miembro de la Junta Directiva: ve las juntas cerradas. Lo marcan Administración o la dirección regional. */
  junta: boolean
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

/** Solicitud de acceso pendiente de aprobación (solo la ve Administración). */
export interface AccessRequest {
  id: string
  email: string
  displayName: string
  /** Las solicitudes nuevas no traen territorio: lo elige Administración al aprobar. */
  territory: TerritoryId | null
  createdAt: string
}

/** Miembro en el listado de la dirección. */
export interface Member {
  /** Id del perfil (para que Administración cambie su rol). */
  id: string
  displayName: string
  email: string
  territory: TerritoryId
  role: UserRole
  interests: InterestId[]
  createdAt: string
  junta: boolean
}

export type ActionResult = { ok: true; message: string } | { ok: false; message: string }
