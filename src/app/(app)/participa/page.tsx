import type { Metadata } from 'next'
import Link from 'next/link'
import { CreateButton } from '@/components/content/CreateButton'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { CampaignBlock } from '@/components/projects/CampaignBlock'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { SectionHeader } from '@/components/ui/Eyebrow'
import { FlagDivider } from '@/components/ui/FlagDivider'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { TerritoryFilter } from '@/components/ui/TerritoryFilter'
import { creatableTerritories } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContentFor } from '@/lib/content/source'
import { madridDate } from '@/lib/domain/dates'
import { campaignActivityCount, featuredProject, sortProjectsForUser, visibleProjects } from '@/lib/domain/selectors'
import { matchesTerritoryFilter, parseTerritoryFilter, territoryName } from '@/lib/domain/territories'
import { projectViews } from '@/lib/view/projects'

export const metadata: Metadata = { title: 'Proyectos' }

type Search = Promise<Record<string, string | string[] | undefined>>

export default async function ParticipaPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser()
  const params = await searchParams
  const content = await getContentFor(user)
  const territory = parseTerritoryFilter(Array.isArray(params.t) ? params.t[0] : params.t)

  const campaign = featuredProject(content)
  const projects = sortProjectsForUser(
    visibleProjects(content.projects).filter((p) => p.id !== campaign?.id && matchesTerritoryFilter(p.territory, territory)),
    user.territory,
  )
  const [views, campaignViews] = await Promise.all([
    projectViews(projects, content.opportunities, user.id),
    projectViews(campaign ? [campaign] : [], content.opportunities, user.id),
  ])
  const campaignView = campaignViews[0] ?? null
  const preparing = views.filter((v) => v.project.status === 'en_preparacion')
  const running = views.filter((v) => v.project.status === 'en_marcha')
  // Para quien puede editarlos: los cerrados u ocultos, para poder reabrirlos.
  const editable = new Set(creatableTerritories(user))
  const closed = content.projects.filter(
    (p) => (p.status === 'cerrado' || !p.visible) && editable.has(p.territory) && matchesTerritoryFilter(p.territory, territory),
  )
  const mine = [...campaignViews, ...views].filter((v) => v.participation)

  return (
    <>
      <PageHeader
        eyebrow="Proyectos"
        action={creatableTerritories(user).length > 0 ? <CreateButton href="/participa/nuevo" label="Nuevo proyecto" /> : null}
        title="Lo que está entre manos"
      >
        Elige de qué proyecto quieres formar parte.
      </PageHeader>

      {campaignView ? (
        <>
          <FlagDivider />
          <CampaignBlock
            view={campaignView}
            today={madridDate(new Date())}
            activityCount={campaignActivityCount(content.activities, campaignView.project, new Date())}
            primary="view"
            slogan={content.config.campaignSlogan}
            image={content.config.campaignImage}
          />
          <FlagDivider />
        </>
      ) : null}

      <Container className="py-6 md:py-8">
        <TerritoryFilter value={territory} territories={content.territories} userTerritory={user.territory} />

        {mine.length > 0 ? (
          <Link
            href="/perfil#participaciones"
            className="press mt-5 flex items-center gap-3 rounded-2xl border border-success/30 bg-success-50 px-5 py-4 text-success"
          >
            <span className="flex size-8 items-center justify-center rounded-full bg-success text-white">
              <Icon name="check" size={16} strokeWidth={3} />
            </span>
            <span className="flex-1 text-sm font-semibold">
              Participas en {mine.length === 1 ? '1 iniciativa' : `${mine.length} iniciativas`}
            </span>
            <Icon name="chevronRight" size={18} />
          </Link>
        ) : null}

        <section className="mt-8">
          <SectionHeader eyebrow="En preparación" title="Entra antes de que esté decidido." />
          {preparing.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {preparing.map((view) => (
                <ProjectCard key={view.project.id} view={view} className="animate-rise" />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nada en preparación aquí"
              icon="participa"
              action={territory !== 'todos' ? { href: '/participa', label: 'Ver todos los territorios' } : undefined}
            >
              Cuando empecemos a preparar una iniciativa en este territorio, la verás aquí la primera.
            </EmptyState>
          )}
        </section>

        {running.length > 0 ? (
          <section className="mt-12">
            <SectionHeader eyebrow="En marcha" title="Ya arrancado, aún suma gente." />
            <div className="grid gap-4 md:grid-cols-2">
              {running.map((view) => (
                <ProjectCard key={view.project.id} view={view} />
              ))}
            </div>
          </section>
        ) : null}

        {closed.length > 0 ? (
          <section id="cerrados" className="mt-12">
            <SectionHeader eyebrow="Solo dirección" title="Cerrados u ocultos." />
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-card">
              {closed.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span className="min-w-0">
                    <span className="block truncate font-semibold text-ink">{p.title}</span>
                    <span className="eyebrow !text-[0.58rem] text-slate">
                      {territoryName(p.territory)} · {p.status === 'cerrado' ? 'Cerrado' : 'Oculto'}
                    </span>
                  </span>
                  <Link
                    href={`/participa/${encodeURIComponent(p.id)}/editar`}
                    aria-label={`Editar ${p.title}`}
                    className="press inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-bold text-ink hover:border-electric"
                  >
                    <Icon name="edit" size={14} /> Editar
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </>
  )
}
