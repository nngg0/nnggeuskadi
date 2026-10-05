import Link from 'next/link'
import { formatDayMonth } from '@/lib/domain/dates'
import type { OpenOpportunity } from '@/lib/domain/selectors'
import { territoryName } from '@/lib/domain/territories'
import { Icon } from '@/components/ui/Icon'

/** Ámbito abierto de un proyecto: cualquiera puede sumarse. */
export function OpportunityCard({ item }: { item: OpenOpportunity }) {
  const { opportunity, project } = item
  return (
    <Link
      href={`/participa/${encodeURIComponent(project.id)}`}
      className="press group flex h-full w-[17.5rem] min-w-0 shrink-0 flex-col rounded-[var(--radius-card)] border border-line bg-white p-5 hover:border-electric/40 sm:w-full"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="eyebrow min-w-0 truncate !text-[0.62rem] text-electric">{project.title}</span>
        <span className="eyebrow shrink-0 !text-[0.58rem] text-slate">{territoryName(project.territory)}</span>
      </div>
      <p className="mt-3 text-[1.15rem] font-extrabold leading-snug tracking-[-0.01em] text-night">{opportunity.name}</p>
      {opportunity.description ? (
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate">{opportunity.description}</p>
      ) : null}
      <div className="mt-auto flex items-end justify-between gap-3 pt-4">
        <span className="text-xs font-semibold text-slate">
          {opportunity.deadline ? `Hasta el ${formatDayMonth(opportunity.deadline)}` : 'Abierto'}
        </span>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-electric-50 text-electric transition-colors group-hover:bg-electric group-hover:text-white">
          <Icon name="arrowRight" size={18} />
        </span>
      </div>
    </Link>
  )
}
