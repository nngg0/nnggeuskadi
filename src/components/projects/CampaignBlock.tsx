import Link from 'next/link'
import { formatMonthShort, formatWeekdayShort } from '@/lib/domain/dates'
import { daysUntil } from '@/lib/domain/selectors'
import type { ProjectView } from '@/lib/view/projects'
import { Container } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { ParticipateFlow } from './ParticipateFlow'
import { toOptions } from './ProjectCard'

/** Hoja de calendario con la fecha de la campaña. */
function CalendarTile({ date }: { date: string }) {
  return (
    <div className="w-24 shrink-0 overflow-hidden rounded-2xl bg-white text-center text-night shadow-xl shadow-black/30 sm:w-28">
      <p className="eyebrow bg-flag-red py-1.5 !text-[0.62rem] text-white">{formatMonthShort(date)}</p>
      <p className="font-display text-5xl leading-none sm:text-6xl">
        <span className="block pt-2">{Number(date.slice(8, 10))}</span>
      </p>
      <p className="eyebrow pb-2 pt-1 !text-[0.58rem] text-night/60">{formatWeekdayShort(date)}</p>
    </div>
  )
}

/** Bloque principal: la campaña que la organización marca en CONFIGURACION (p. ej. Campaña 29N). */
export function CampaignBlock({ view, today }: { view: ProjectView; today: string }) {
  const { project } = view
  const days = project.expectedDate ? daysUntil(project.expectedDate, today) : null
  return (
    <section id="campana" aria-labelledby="campana-titulo" className="relative overflow-hidden bg-brand text-white">
      <div aria-hidden className="pointer-events-none absolute -bottom-32 -right-20 size-96 rounded-full bg-electric/25 blur-3xl" />
      <Container className="relative py-9 md:py-12">
        <p className="eyebrow text-white/70">Campaña</p>
        <div className="mt-3 flex items-start gap-5 sm:gap-7">
          {project.expectedDate ? <CalendarTile date={project.expectedDate} /> : null}
          <div className="min-w-0">
            <h2 id="campana-titulo" className="display text-[2.9rem] !text-white sm:text-6xl md:text-7xl">
              {project.title}
            </h2>
            <dl className="mt-4 flex flex-wrap gap-x-7 gap-y-3">
              {days !== null && days >= 0 ? (
                <div>
                  <dd className="font-display text-4xl leading-none text-sky sm:text-5xl">{days}</dd>
                  <dt className="eyebrow mt-1 text-white/70">{days === 1 ? 'día' : 'días'}</dt>
                </div>
              ) : null}
              <div>
                <dd className="font-display text-4xl leading-none text-sky sm:text-5xl">{view.participantCount}</dd>
                <dt className="eyebrow mt-1 text-white/70">{view.participantCount === 1 ? 'persona participa' : 'personas participan'}</dt>
              </div>
            </dl>
          </div>
        </div>
        {project.description ? <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-white/75">{project.description}</p> : null}
        <div className="mt-6 grid max-w-md gap-3">
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
      </Container>
    </section>
  )
}
