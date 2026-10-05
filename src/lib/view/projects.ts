import 'server-only'
import { madridDate } from '@/lib/domain/dates'
import { opportunitiesForProject, opportunityAvailability, type OpportunityAvailability } from '@/lib/domain/selectors'
import type { Opportunity, Participation, Project } from '@/lib/domain/types'
import { personalStore } from '@/lib/personal'

export interface OpportunityView {
  opportunity: Opportunity
  availability: OpportunityAvailability
  chosen: boolean
}

export interface ProjectView {
  project: Project
  opportunities: OpportunityView[]
  participantCount: number
  participation: Participation | null
  hasOpenOpportunities: boolean
}

export async function projectViews(
  projects: Project[],
  allOpportunities: Opportunity[],
  userId: string,
  now = new Date(),
): Promise<ProjectView[]> {
  const store = personalStore()
  const [counts, mine] = await Promise.all([
    store.participationCounts(projects.map((p) => p.id)),
    store.myParticipations(userId),
  ])
  const today = madridDate(now)
  return projects.map((project) => {
    const participation = mine.find((p) => p.projectId === project.id) ?? null
    const chosen = new Set(participation?.opportunityIds ?? [])
    const opportunities = opportunitiesForProject(allOpportunities, project.id).map((opportunity) => ({
      opportunity,
      availability: opportunityAvailability(opportunity, counts.byOpportunity.get(opportunity.id) ?? 0, today),
      chosen: chosen.has(opportunity.id),
    }))
    return {
      project,
      opportunities,
      participantCount: counts.byProject.get(project.id) ?? 0,
      participation,
      hasOpenOpportunities: opportunities.some((o) => o.availability.isOpen),
    }
  })
}
