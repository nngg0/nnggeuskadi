import type { Metadata } from 'next'
import Link from 'next/link'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { Container } from '@/components/layout/PageHeader'
import { CampaignBlock } from '@/components/projects/CampaignBlock'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { ArrowLink } from '@/components/ui/Button'
import { SectionHeader } from '@/components/ui/Eyebrow'
import { FlagDivider } from '@/components/ui/FlagDivider'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContentFor } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { campaignActivityCount, featuredProject, preparingProjects, upcomingActivities } from '@/lib/domain/selectors'
import { personalStore } from '@/lib/personal'
import { activityViews } from '@/lib/view/activities'
import { projectViews } from '@/lib/view/projects'

export const metadata: Metadata = { title: 'Inicio' }

const UPCOMING_COUNT = 5

/** Inicio: saludo, la campaña, los cinco actos más próximos y lo que todavía estamos preparando. */
export default async function HomePage() {
  const user = await requireUser()
  const content = await getContentFor(user)
  const now = new Date()
  const today = madridDate(now)

  const upcoming = upcomingActivities(content.activities, now).slice(0, UPCOMING_COUNT)
  const campaign = featuredProject(content)
  const preparing = preparingProjects(content.projects, user.territory)
    .filter((p) => p.id !== campaign?.id)
    .slice(0, 3)
  const store = personalStore()

  const [upcomingViews, preparingViews, campaignViews] = await Promise.all([
    activityViews(upcoming, user.id, now),
    projectViews(preparing, content.opportunities, user.id, now),
    projectViews(campaign ? [campaign] : [], content.opportunities, user.id, now),
  ])
  const campaignView = campaignViews[0] ?? null
  const pendingRequests = can(user, 'members.approve') ? (await store.listAccessRequests()).length : 0
  const firstName = user.displayName.split(' ')[0]

  return (
    <>
      <section className="relative overflow-hidden bg-night text-white">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-electric/20 blur-3xl" />
        <Container className="relative pb-7 pt-7 md:pb-10 md:pt-12">
          <p className="eyebrow text-sky">NNGG Euskadi</p>
          <h1 className="display mt-3 text-[3.2rem] sm:text-6xl md:text-7xl">Hola, {firstName}</h1>
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

      {campaignView ? (
        <>
          <FlagDivider />
          <CampaignBlock view={campaignView} today={today} activityCount={campaignActivityCount(content.activities, campaignView.project, now)} />
          <FlagDivider />
        </>
      ) : null}

      <section id="proximamente" className="scroll-mt-20 py-10 md:py-14">
        <Container>
          <SectionHeader
            eyebrow="Próximos actos"
            title="Lo que viene."
            action={<ArrowLink href="/calendario" className="hidden sm:inline-flex">Ver calendario completo</ArrowLink>}
          />
          {upcomingViews.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upcomingViews.map((view) => (
                <ActivityCard key={view.activity.id} view={view} className="animate-rise" />
              ))}
            </div>
          ) : (
            <EmptyState title="No hay actos programados" icon="calendar" action={{ href: '/participa', label: 'Ver qué estamos preparando' }}>
              Ahora mismo no hay convocatorias confirmadas. Mientras tanto, puedes ayudar a preparar las siguientes.
            </EmptyState>
          )}
          <ArrowLink href="/calendario" className="mt-5 sm:hidden">Ver calendario completo</ArrowLink>
        </Container>
      </section>

      <section id="en-preparacion" className="scroll-mt-14 bg-night py-12 text-white md:py-16">
        <Container>
          <SectionHeader dark eyebrow="En preparación" title="Esto todavía lo estamos preparando." />
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
            Ver todos los proyectos <Icon name="arrowRight" size={18} />
          </Link>
        </Container>
      </section>
    </>
  )
}
