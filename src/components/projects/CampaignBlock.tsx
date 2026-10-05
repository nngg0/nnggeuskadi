import Link from 'next/link'
import { formatFullDate } from '@/lib/domain/dates'
import { daysUntil } from '@/lib/domain/selectors'
import type { ProjectView } from '@/lib/view/projects'
import { Container } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { ParticipateFlow } from './ParticipateFlow'
import { toOptions } from './ProjectCard'

/** Bloque principal: la campaña que la organización marca en CONFIGURACION (p. ej. Campaña 29N). */
export function CampaignBlock({ view, today }: { view: ProjectView; today: string }) {
  const { project } = view
  const days = project.expectedDate ? daysUntil(project.expectedDate, today) : null
  const open = view.opportunities.filter((o) => o.availability.isOpen)
  return (
    <section id="campana" aria-labelledby="campana-titulo" className="relative overflow-hidden bg-brand text-white">
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-white/10 blur-3xl" />
      <Container className="relative grid gap-8 py-10 md:grid-cols-[1fr_auto] md:items-end md:py-14">
        <div>
          <p className="eyebrow text-white/70">Campaña principal</p>
          <h2 id="campana-titulo" className="display mt-3 text-[3rem] sm:text-6xl md:text-7xl">
            {project.title}
          </h2>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/80">{project.description}</p>
          {open.length > 0 ? (
            <ul className="mt-6 flex flex-wrap gap-2" aria-label="Puedes participar en">
              {open.map(({ opportunity, chosen }) => (
                <li
                  key={opportunity.id}
                  className={
                    chosen
                      ? 'rounded-full bg-white px-3 py-1.5 text-[0.8rem] font-bold text-brand'
                      : 'rounded-full border border-white/30 px-3 py-1.5 text-[0.8rem] font-semibold text-white'
                  }
                >
                  {opportunity.name}
                </li>
              ))}
            </ul>
          ) : null}
          <div className="mt-7 grid max-w-md gap-3">
            <ParticipateFlow
              projectId={project.id}
              projectTitle={project.title}
              options={toOptions(view)}
              participating={view.participation !== null}
              tone="brand"
            />
            <Link href={`/participa/${encodeURIComponent(project.id)}`} className="press inline-flex items-center gap-2 text-sm font-bold text-white/85 hover:text-white">
              Ver la campaña <Icon name="arrowRight" size={18} />
            </Link>
          </div>
        </div>
        <dl className="flex gap-6 md:flex-col md:gap-4 md:text-right">
          {days !== null && days >= 0 ? (
            <div>
              <dd className="text-6xl font-extrabold leading-none tracking-[-0.05em] md:text-8xl">{days}</dd>
              <dt className="eyebrow mt-1 text-white/70">{days === 1 ? 'día' : 'días'} · {formatFullDate(project.expectedDate!)}</dt>
            </div>
          ) : null}
          {view.participantCount > 0 ? (
            <div>
              <dd className="text-4xl font-extrabold leading-none tracking-[-0.04em] md:text-5xl">{view.participantCount}</dd>
              <dt className="eyebrow mt-1 text-white/70">{view.participantCount === 1 ? 'persona participa' : 'personas participan'}</dt>
            </div>
          ) : null}
        </dl>
      </Container>
    </section>
  )
}
