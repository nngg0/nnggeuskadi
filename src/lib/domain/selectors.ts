import type { Activity, ContentBundle, DocumentItem, Opportunity, Project } from './types'
import { activityStart, isPast } from './registration'
import { madridDate, weekRange } from './dates'
import {
  matchesTerritoryFilter,
  stripAccents,
  territoryRank,
  type TerritoryFilter,
  type TerritoryId,
} from './territories'

/* ---------------------------- Actividades ---------------------------- */

/** Actividades que un afiliado puede ver (visibles y no en borrador). */
export function publicActivities(activities: Activity[]): Activity[] {
  return activities.filter((a) => a.visible && a.status !== 'borrador')
}

export function sortByDate(activities: Activity[]): Activity[] {
  return [...activities].sort((a, b) => activityStart(a).getTime() - activityStart(b).getTime())
}

export function upcomingActivities(activities: Activity[], now: Date): Activity[] {
  return sortByDate(publicActivities(activities).filter((a) => !isPast(a, now)))
}

/**
 * Bloque "Próximamente" de Inicio: actividades confirmadas de su territorio y de Euskadi.
 * Si no hay suficientes, se completa con el resto de territorios.
 */
export function homeUpcoming(
  activities: Activity[],
  userTerritory: TerritoryId,
  now: Date,
  limit = 4,
): { items: Activity[]; thisWeekCount: number } {
  const upcoming = upcomingActivities(activities, now).filter((a) => a.status !== 'cancelada')
  const relevant = upcoming.filter((a) => territoryRank(a.territory, userTerritory) <= 1)
  const others = upcoming.filter((a) => territoryRank(a.territory, userTerritory) > 1)
  const items = [...relevant, ...others].slice(0, limit)
  const featured = upcoming.find((a) => a.featured && territoryRank(a.territory, userTerritory) <= 1)
  if (featured && !items.includes(featured)) items.splice(limit - 1, 1, featured)
  const week = weekRange(madridDate(now))
  const thisWeekCount = relevant.filter((a) => a.date >= week.start && a.date <= week.end).length
  return { items: sortByDate(items), thisWeekCount }
}

export function filterActivitiesByTerritory(activities: Activity[], filter: TerritoryFilter): Activity[] {
  return activities.filter((a) => matchesTerritoryFilter(a.territory, filter))
}

/* ----------------------------- Proyectos ----------------------------- */

export function visibleProjects(projects: Project[]): Project[] {
  return projects.filter((p) => p.visible && p.status !== 'cerrado')
}

/** Ordena por prioridad territorial, destacados primero, luego fecha prevista. */
export function sortProjectsForUser(projects: Project[], userTerritory: TerritoryId): Project[] {
  return [...projects].sort((a, b) => {
    const rank = territoryRank(a.territory, userTerritory) - territoryRank(b.territory, userTerritory)
    if (rank !== 0) return rank
    if (a.featured !== b.featured) return a.featured ? -1 : 1
    return (a.expectedDate ?? '9999').localeCompare(b.expectedDate ?? '9999')
  })
}

export function preparingProjects(projects: Project[], userTerritory: TerritoryId): Project[] {
  return sortProjectsForUser(
    visibleProjects(projects).filter((p) => p.status === 'en_preparacion'),
    userTerritory,
  )
}

/** Proyecto destacado (CONFIGURACION → campana_principal), si existe y sigue visible. */
export function featuredProject(content: Pick<ContentBundle, 'projects' | 'config'>): Project | null {
  const id = content.config.featuredProjectId
  return id ? (visibleProjects(content.projects).find((p) => p.id === id) ?? null) : null
}

/** Días que faltan hasta una fecha (0 = hoy). */
export function daysUntil(date: string, today: string): number {
  return Math.round((Date.parse(`${date}T12:00:00Z`) - Date.parse(`${today}T12:00:00Z`)) / 864e5)
}

export function opportunitiesForProject(opportunities: Opportunity[], projectId: string): Opportunity[] {
  return opportunities.filter((o) => o.projectId === projectId && o.visible)
}

export interface OpportunityAvailability {
  participants: number
  isOpen: boolean
}

/** Sin cupos: una oportunidad está abierta hasta que la organización la cierra o vence su fecha límite. */
export function opportunityAvailability(
  opportunity: Opportunity,
  participants: number,
  today: string,
): OpportunityAvailability {
  const expired = opportunity.deadline !== null && opportunity.deadline < today
  return { participants, isOpen: opportunity.status === 'abierta' && !expired }
}

export interface OpenOpportunity {
  opportunity: Opportunity
  project: Project
  availability: OpportunityAvailability
}

/** Bloque "Puedes participar en...": oportunidades abiertas, priorizando el territorio del usuario. */
export function openOpportunities(
  content: Pick<ContentBundle, 'projects' | 'opportunities'>,
  participantCounts: Map<string, number>,
  userTerritory: TerritoryId,
  today: string,
): OpenOpportunity[] {
  const projects = new Map(visibleProjects(content.projects).map((p) => [p.id, p]))
  const result: OpenOpportunity[] = []
  for (const opportunity of content.opportunities) {
    const project = projects.get(opportunity.projectId)
    if (!project || !opportunity.visible) continue
    const availability = opportunityAvailability(opportunity, participantCounts.get(opportunity.id) ?? 0, today)
    if (availability.isOpen) result.push({ opportunity, project, availability })
  }
  return result.sort((a, b) => {
    const rank = territoryRank(a.project.territory, userTerritory) - territoryRank(b.project.territory, userTerritory)
    if (rank !== 0) return rank
    return (a.opportunity.deadline ?? '9999').localeCompare(b.opportunity.deadline ?? '9999')
  })
}

/* ----------------------------- Documentos ---------------------------- */

export function normalizeSearch(value: string): string {
  return stripAccents(value).toLowerCase().replace(/\s+/g, ' ').trim()
}

export interface DocumentQuery {
  q?: string
  territory?: TerritoryFilter
  category?: string | null
}

export function searchDocuments(documents: DocumentItem[], query: DocumentQuery, userTerritory: TerritoryId): DocumentItem[] {
  const terms = normalizeSearch(query.q ?? '')
    .split(' ')
    .filter(Boolean)
  return documents
    .filter((d) => d.visible)
    .filter((d) => matchesTerritoryFilter(d.territory, query.territory ?? 'todos'))
    .filter((d) => !query.category || d.category === query.category)
    .filter((d) => {
      if (terms.length === 0) return true
      const haystack = normalizeSearch(`${d.title} ${d.description} ${d.category}`)
      return terms.every((t) => haystack.includes(t))
    })
    .sort((a, b) => {
      const rank = territoryRank(a.territory, userTerritory) - territoryRank(b.territory, userTerritory)
      if (rank !== 0) return rank
      return (b.date ?? '').localeCompare(a.date ?? '')
    })
}

export function recentDocuments(documents: DocumentItem[], limit = 5): DocumentItem[] {
  return documents
    .filter((d) => d.visible)
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    .slice(0, limit)
}

export function featuredDocuments(documents: DocumentItem[], userTerritory: TerritoryId): DocumentItem[] {
  return documents
    .filter((d) => d.visible && d.featured)
    .sort((a, b) => territoryRank(a.territory, userTerritory) - territoryRank(b.territory, userTerritory))
}

/** Categorías en el orden de CONFIGURACION, añadiendo al final las que solo aparecen en documentos. */
export function documentCategories(documents: DocumentItem[], configured: string[]): string[] {
  const present = new Set(documents.filter((d) => d.visible).map((d) => d.category))
  const ordered = configured.filter((c) => present.has(c))
  for (const c of [...present].sort((a, b) => a.localeCompare(b, 'es'))) if (!ordered.includes(c)) ordered.push(c)
  return ordered
}
