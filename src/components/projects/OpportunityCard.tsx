import Link from 'next/link'
import { formatDayMonth } from '@/lib/domain/dates'
import type { OpenOpportunity } from '@/lib/domain/selectors'
import { territoryName } from '@/lib/domain/territories'
import { Icon } from '@/components/ui/Icon'

/** Oportunidad concreta: "Necesitamos 4 personas para ayudar en las mesas". */
export function OpportunityCard({ item }: { item: OpenOpportunity }) {
  const { opportunity, project, availability } = item
  const need =
    availability.remaining === null
      ? 'Abierto a todas las personas'
      : availability.remaining === 1
        ? 'Necesitamos 1 persona'
        : `Necesitamos ${availability.remaining} personas`
  return (
    <Link
      href={`/participa/${encodeURIComponent(project.id)}`}
      className="press group flex h-full w-[17.5rem] min-w-0 shrink-0 flex-col rounded-[var(--radius-card)] border border-line bg-white p-5 hover:border-electric/40 sm:w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow !text-[0.62rem] text-electric">{opportunity.name}</span>
        <span className="eyebrow !text-[0.58rem] text-slate">{territoryName(project.territory)}</span>
      </div>
      <p className="mt-3 text-[1.05rem] font-bold leading-snug text-night">{need}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate">
        {opportunity.description || `Para ${project.title}.`}
      </p>
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-night">{project.title}</span>
          {opportunity.deadline ? (
            <span className="block text-xs text-slate">Hasta el {formatDayMonth(opportunity.deadline)}</span>
          ) : null}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-electric-50 text-electric transition-colors group-hover:bg-electric group-hover:text-white">
          <Icon name="arrowRight" size={18} />
        </span>
      </div>
    </Link>
  )
}
