import Link from 'next/link'
import { cn } from '@/lib/cn'
import { formatDayMonth } from '@/lib/domain/dates'
import { territoryName } from '@/lib/domain/territories'
import type { ProjectView } from '@/lib/view/projects'
import { Icon } from '@/components/ui/Icon'
import { ParticipateFlow, type OpportunityOption } from './ParticipateFlow'

export function toOptions(view: ProjectView): OpportunityOption[] {
  return view.opportunities.map(({ opportunity, availability, chosen }) => ({
    id: opportunity.id,
    name: opportunity.name,
    description: opportunity.description,
    capacity: opportunity.capacity,
    remaining: availability.remaining,
    deadline: opportunity.deadline,
    isOpen: availability.isOpen,
    chosen,
  }))
}

export const PROJECT_STATUS_LABEL = {
  en_preparacion: 'En preparación',
  en_marcha: 'En marcha',
  cerrado: 'Cerrado',
} as const

/**
 * Tarjeta de proyecto. Variante "dark" para la zona de identidad de Inicio
 * y "light" para las listas de Participa.
 */
export function ProjectCard({ view, tone = 'light', className }: { view: ProjectView; tone?: 'light' | 'dark'; className?: string }) {
  const { project } = view
  const dark = tone === 'dark'
  const open = view.opportunities.filter((o) => o.availability.isOpen)
  return (
    <article
      className={cn(
        'flex flex-col rounded-[var(--radius-card)] border p-6 sm:p-7',
        dark ? 'border-white/10 bg-night-2 text-white' : 'border-line bg-white',
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn('eyebrow', dark ? 'text-sky' : 'text-electric')}>
          {PROJECT_STATUS_LABEL[project.status]}
          {project.kind ? ` · ${project.kind}` : ''}
        </span>
        <span className={cn('eyebrow', dark ? 'text-white/45' : 'text-slate')}>{territoryName(project.territory)}</span>
      </div>

      <Link href={`/participa/${encodeURIComponent(project.id)}`} className="group mt-3 block">
        <h3 className={cn('display text-[1.7rem] sm:text-[1.9rem]', dark ? 'text-white' : 'text-night')}>
          {project.title}
          <Icon name="arrowRight" size={22} className={cn('ml-2 inline align-[-2px] opacity-0 transition-all group-hover:translate-x-0.5 group-hover:opacity-100', dark ? 'text-sky' : 'text-electric')} />
        </h3>
      </Link>
      <p className={cn('mt-3 line-clamp-3 text-[0.95rem] leading-relaxed', dark ? 'text-white/70' : 'text-slate')}>{project.description}</p>

      {open.length > 0 ? (
        <div className="mt-5">
          <p className={cn('eyebrow !text-[0.62rem]', dark ? 'text-white/50' : 'text-slate')}>Buscamos personas para</p>
          <ul className="mt-2.5 flex flex-wrap gap-2">
            {open.map(({ opportunity, chosen }) => (
              <li
                key={opportunity.id}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[0.8rem] font-semibold',
                  chosen
                    ? 'bg-electric text-white'
                    : dark
                      ? 'border border-white/15 text-white/85'
                      : 'border border-line-strong text-night',
                )}
              >
                {opportunity.name}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={cn('mt-5 text-sm font-semibold', dark ? 'text-white/60' : 'text-slate')}>
          Ahora mismo no hay huecos abiertos en este proyecto.
        </p>
      )}

      <div className={cn('mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.8rem]', dark ? 'text-white/55' : 'text-slate')}>
        {view.participantCount > 0 ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="users" size={15} className={dark ? 'text-sky' : 'text-electric'} />
            {view.participantCount === 1 ? '1 persona ya se ha ofrecido' : `${view.participantCount} personas ya se han ofrecido`}
          </span>
        ) : null}
        {project.expectedDate ? (
          <span className="inline-flex items-center gap-1.5">
            <Icon name="calendar" size={15} className={dark ? 'text-sky' : 'text-electric'} />
            Previsto para el {formatDayMonth(project.expectedDate)}
          </span>
        ) : null}
      </div>

      <div className="mt-6 pt-1 sm:mt-auto sm:pt-6">
        <ParticipateFlow
          projectId={project.id}
          projectTitle={project.title}
          options={toOptions(view)}
          participating={view.participation !== null}
          tone={tone}
        />
      </div>
    </article>
  )
}
