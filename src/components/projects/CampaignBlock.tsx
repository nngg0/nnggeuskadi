import Image from 'next/image'
import Link from 'next/link'
import { formatMonthShort, formatWeekdayShort } from '@/lib/domain/dates'
import { daysUntil } from '@/lib/domain/selectors'
import type { ProjectView } from '@/lib/view/projects'
import { Container } from '@/components/layout/PageHeader'
import { ButtonLink } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { ParticipateFlow } from './ParticipateFlow'
import { toOptions } from './ProjectCard'

/** Hoja de calendario con la fecha de la campaña. */
function CalendarTile({ date }: { date: string }) {
  return (
    <div className="w-20 shrink-0 overflow-hidden rounded-2xl bg-white text-center text-night shadow-xl shadow-black/30 sm:w-24">
      <p className="eyebrow bg-flag-red py-1.5 !text-[0.6rem] text-white">{formatMonthShort(date)}</p>
      <p className="font-display text-5xl leading-none">
        <span className="block pt-2">{Number(date.slice(8, 10))}</span>
      </p>
      <p className="eyebrow pb-2 pt-1 !text-[0.56rem] text-night/60">{formatWeekdayShort(date)}</p>
    </div>
  )
}

/**
 * Bloque principal: la campaña que la organización marca en CONFIGURACION (p. ej. Campaña 29N).
 * Con el estilo de los carteles: azul con foco de luz, lema enorme en blanco (campana_lema)
 * y, si la hay, la imagen de campaña (campana_imagen, en pantallas anchas).
 */
export function CampaignBlock({
  view,
  today,
  activityCount,
  slogan,
  image,
  primary = 'participate',
}: {
  view: ProjectView
  today: string
  activityCount: number
  slogan?: string | null
  image?: string | null
  /** Botón principal: «Quiero participar» (Inicio) o «Ver la campaña» (Proyectos). */
  primary?: 'participate' | 'view'
}) {
  const { project } = view
  const days = project.expectedDate ? daysUntil(project.expectedDate, today) : null
  const [first, ...rest] = (slogan ?? '').split(/\s+/).filter(Boolean)
  return (
    <section
      id="campana"
      aria-labelledby="campana-titulo"
      className="relative overflow-hidden bg-[radial-gradient(ellipse_at_35%_45%,#0a72c4_0%,#0b62b0_35%,#0b4f98_75%,#0a4489_100%)] text-white"
    >
      <Container className="relative grid items-center gap-8 py-10 md:grid-cols-[1fr_auto] md:py-14">
        <div className="min-w-0">
          {first ? (
            <div aria-hidden className="mb-7">
              <p className="font-display uppercase leading-[0.94] tracking-[-0.01em] text-[#eef2f0]">
                <span className="block text-[5.5rem] sm:text-[7.5rem] md:text-[8.5rem]">{first}</span>
                {rest.length > 0 ? <span className="block text-[5.5rem] sm:text-[7.5rem] md:text-[8.5rem]">{rest.join(' ')}</span> : null}
              </p>
            </div>
          ) : null}

          <p className="eyebrow text-white/70">Campaña</p>
          <div className="mt-3 flex items-center gap-5">
            {project.expectedDate ? <CalendarTile date={project.expectedDate} /> : null}
            <div className="min-w-0">
              <h2 id="campana-titulo" className="display text-[2.4rem] !text-white sm:text-5xl">
                {project.title}
              </h2>
              <dl className="mt-3 flex flex-wrap gap-x-7 gap-y-3">
                {days !== null && days >= 0 ? (
                  <div>
                    <dd className="font-display text-4xl leading-none text-sky">{days}</dd>
                    <dt className="eyebrow mt-1 text-white/70">{days === 1 ? 'día' : 'días'}</dt>
                  </div>
                ) : null}
                <div>
                  <dd className="font-display text-4xl leading-none text-sky">{activityCount}</dd>
                  <dt className="eyebrow mt-1 text-white/70">{activityCount === 1 ? 'acto' : 'actos'}</dt>
                </div>
              </dl>
            </div>
          </div>
          {project.description ? <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-white/80">{project.description}</p> : null}
          <div className="mt-6 grid max-w-md gap-3">
            {primary === 'view' ? (
              <>
                <ButtonLink href={`/participa/${encodeURIComponent(project.id)}`} variant="onDark" block arrow>
                  Ver la campaña
                </ButtonLink>
                <ParticipateFlow
                  projectId={project.id}
                  projectTitle={project.title}
                  options={toOptions(view)}
                  participating={view.participation !== null}
                  tone="brandOutline"
                />
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        </div>

        {image ? (
          <div className="hidden md:block">
            <Image
              src={image}
              alt={`Cartel de ${project.title}`}
              width={516}
              height={735}
              unoptimized
              className="h-auto w-[17rem] rounded-2xl shadow-2xl shadow-black/40 lg:w-[19rem]"
            />
          </div>
        ) : null}
      </Container>
    </section>
  )
}
