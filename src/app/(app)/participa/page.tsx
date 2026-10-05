import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { ProjectCard } from '@/components/projects/ProjectCard'
import { SectionHeader } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { TerritoryFilter } from '@/components/ui/TerritoryFilter'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { sortProjectsForUser, visibleProjects } from '@/lib/domain/selectors'
import { matchesTerritoryFilter, parseTerritoryFilter } from '@/lib/domain/territories'
import { projectViews } from '@/lib/view/projects'

export const metadata: Metadata = { title: 'Participa' }

type Search = Promise<Record<string, string | string[] | undefined>>

export default async function ParticipaPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser()
  const params = await searchParams
  const content = await getContent()
  const territory = parseTerritoryFilter(Array.isArray(params.t) ? params.t[0] : params.t)

  const projects = sortProjectsForUser(
    visibleProjects(content.projects).filter((p) => matchesTerritoryFilter(p.territory, territory)),
    user.territory,
  )
  const views = await projectViews(projects, content.opportunities, user.id)
  const preparing = views.filter((v) => v.project.status === 'en_preparacion')
  const running = views.filter((v) => v.project.status === 'en_marcha')
  const mine = views.filter((v) => v.participation)

  return (
    <>
      <PageHeader
        eyebrow="Participa"
        title={
          <>
            Lo que todavía
            <br />
            estamos construyendo.
          </>
        }
      >
        Aquí no hay convocatorias cerradas: hay iniciativas a medio hacer. Elige dónde quieres aportar y quien lo prepara contará contigo.
      </PageHeader>

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
              Participas en {mine.length === 1 ? '1 iniciativa' : `${mine.length} iniciativas`} de esta lista
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
      </Container>
    </>
  )
}
