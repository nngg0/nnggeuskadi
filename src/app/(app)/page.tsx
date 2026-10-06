import type { Metadata } from 'next'
import Link from 'next/link'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { Container } from '@/components/layout/PageHeader'
import { CampaignBlock } from '@/components/projects/CampaignBlock'
import { OpportunityCard } from '@/components/projects/OpportunityCard'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ArrowLink } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { formatRelativeDay, madridDate } from '@/lib/domain/dates'
import { featuredProject, homeUpcoming, openOpportunities, preparingProjects, upcomingActivities } from '@/lib/domain/selectors'
import { personalStore } from '@/lib/personal'
import { activityViews } from '@/lib/view/activities'
import { projectViews } from '@/lib/view/projects'

export const metadata: Metadata = { title: 'Inicio' }

const NUMBERS = ['Nada', 'Una cosa', 'Dos cosas', 'Tres cosas', 'Cuatro cosas', 'Cinco cosas', 'Seis cosas']

function upcomingTitle(count: number) {
  if (count === 0) return 'Lo próximo'
  return `${NUMBERS[count] ?? `${count} cosas`} esta semana`
}

/** Inicio: panel personal orientado a la acción — qué viene, qué preparamos, dónde participar. */
export default async function HomePage() {
  const user = await requireUser()
  const content = await getContent()
  const now = new Date()
  const today = madridDate(now)

  const upcoming = homeUpcoming(content.activities, user.territory, now)
  const campaign = featuredProject(content)
  const preparing = preparingProjects(content.projects, user.territory)
    .filter((p) => p.id !== campaign?.id)
    .slice(0, 3)
  const store = personalStore()

  const [upcomingViews, myRegs, preparingViews, campaignViews, counts] = await Promise.all([
    activityViews(upcoming.items, user.id, now),
    store.myRegistrations(user.id),
    projectViews(preparing, content.opportunities, user.id, now),
    projectViews(campaign ? [campaign] : [], content.opportunities, user.id, now),
    store.participationCounts(content.projects.map((p) => p.id)),
  ])
  const campaignView = campaignViews[0] ?? null
  const pendingRequests = can(user, 'members.approve') ? (await store.listAccessRequests()).length : 0
  // La campaña ya muestra sus ámbitos en su bloque: aquí, el resto.
  const opportunities = openOpportunities(content, counts.byOpportunity, user.territory, today)
    .filter((o) => o.project.id !== campaign?.id)
    .slice(0, 8)
  const myIds = new Set(myRegs.map((r) => r.eventId))
  const nextPlan = upcomingActivities(content.activities, now).find((a) => myIds.has(a.id) && a.status !== 'cancelada')
  const firstName = user.displayName.split(' ')[0]

  return (
    <>
      {/* Zona de identidad: editorial, compacta en móvil */}
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-electric/25 blur-3xl" />
        <Container className="relative pb-10 pt-7 md:pb-14 md:pt-14">
          <p className="eyebrow text-sky">NNGG Euskadi · Hola, {firstName}</p>
          <h1 className="display mt-4 max-w-3xl text-[2.9rem] sm:text-6xl md:text-7xl">{content.config.heroTitle}</h1>
          <p className="mt-4 max-w-xl text-base leading-relaxed text-white/70">{content.config.heroSubtitle}</p>

          {nextPlan ? (
            <Link
              href={`/actividades/${encodeURIComponent(nextPlan.id)}`}
              className="press mt-7 flex max-w-md items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10"
            >
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-electric">
                <Icon name="ticket" size={22} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="eyebrow block !text-[0.6rem] text-sky">Tu próximo plan · {formatRelativeDay(nextPlan.date, today)}</span>
                <span className="mt-0.5 block truncate font-bold">{nextPlan.title}</span>
              </span>
              <Icon name="chevronRight" size={20} className="text-white/50" />
            </Link>
          ) : null}

          <nav aria-label="Atajos" className="scrollbar-none -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {[
              { href: '#proximamente', label: '¿Qué viene?' },
              { href: '#en-preparacion', label: '¿Qué estamos preparando?' },
              { href: '#participar', label: '¿Dónde puedo participar?' },
            ].map((q) => (
              <a key={q.href} href={q.href} className="press shrink-0 rounded-full border border-white/15 px-4 py-2.5 text-[0.8rem] font-semibold text-white/85 hover:border-white/40 hover:text-white">
                {q.label}
              </a>
            ))}
          </nav>
        </Container>
      </section>

      {pendingRequests > 0 ? (
        <Link href="/solicitudes" className="press block bg-electric text-white hover:bg-electric-600">
          <Container className="flex items-center gap-3 py-3 text-sm font-bold">
            <Icon name="user" size={18} />
            <span className="flex-1">
              {pendingRequests === 1 ? '1 solicitud de acceso pendiente' : `${pendingRequests} solicitudes de acceso pendientes`}
            </span>
            <span className="inline-flex items-center gap-1">
              Revisar <Icon name="arrowRight" size={16} />
            </span>
          </Container>
        </Link>
      ) : null}

      {campaignView ? <CampaignBlock view={campaignView} today={today} /> : null}

      {/* Próximamente */}
      <section id="proximamente" className="scroll-mt-20 py-10 md:py-14">
        <Container>
          <SectionHeader
            eyebrow="Próximamente"
            title={upcomingTitle(upcoming.thisWeekCount)}
            action={<ArrowLink href="/calendario" className="hidden sm:inline-flex">Ver calendario</ArrowLink>}
          />
          {upcomingViews.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingViews.map((view) => (
                <ActivityCard key={view.activity.id} view={view} className="animate-rise" />
              ))}
            </div>
          ) : (
            <EmptyState title="No hay actividades programadas" icon="calendar" action={{ href: '/participa', label: 'Ver qué estamos preparando' }}>
              Ahora mismo no hay convocatorias confirmadas. Mientras tanto, puedes ayudar a preparar las siguientes.
            </EmptyState>
          )}
          <ArrowLink href="/calendario" className="mt-5 sm:hidden">Ver calendario completo</ArrowLink>
        </Container>
      </section>

      {/* En preparación: el bloque con más peso visual */}
      <section id="en-preparacion" className="scroll-mt-14 bg-night py-12 text-white md:py-16">
        <Container>
          <SectionHeader
            dark
            eyebrow="En preparación"
            title={
              <>
                Esto todavía
                <br />
                lo estamos preparando.
              </>
            }
          />
          <p className="-mt-1 mb-7 max-w-xl text-[0.95rem] leading-relaxed text-white/65">
            Iniciativas que aún no están cerradas. Es el momento de entrar: con ideas, con tiempo o con lo que se te dé bien.
          </p>
          {preparingViews.length > 0 ? (
            <div className="grid gap-4 lg:grid-cols-3">
              {preparingViews.map((view) => (
                <ProjectCard key={view.project.id} view={view} tone="dark" />
              ))}
            </div>
          ) : (
            <div className="rounded-[var(--radius-card)] border border-dashed border-white/20 p-6 text-white/70">
              <p className="eyebrow text-white">Nada en preparación ahora mismo</p>
              <p className="mt-2 text-sm">Cuando empecemos a preparar una nueva iniciativa aparecerá aquí antes que en ningún otro sitio.</p>
            </div>
          )}
          <Link href="/participa" className="press mt-7 inline-flex items-center gap-2 text-sm font-bold text-sky hover:text-white">
            Ver todo lo que se está preparando <Icon name="arrowRight" size={18} />
          </Link>
        </Container>
      </section>

      {/* Puedes participar en... */}
      <section id="participar" className="scroll-mt-20 py-10 md:py-14">
        <Container>
          <SectionHeader eyebrow="Puedes participar en…" title="Súmate a lo que quieras." />
          {opportunities.length > 0 ? (
            <ul className="scrollbar-none -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
              {opportunities.map((item) => (
                <li key={item.opportunity.id} className="flex shrink-0 sm:min-w-0 sm:shrink">
                  <OpportunityCard item={item} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Nada abierto ahora mismo" icon="users" action={{ href: '/calendario', label: 'Ver calendario' }}>
              Cuando abramos una nueva iniciativa para participar, aparecerá aquí.
            </EmptyState>
          )}
        </Container>
      </section>
    </>
  )
}
