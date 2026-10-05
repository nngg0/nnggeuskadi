import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container } from '@/components/layout/PageHeader'
import { PeopleList } from '@/components/profile/PeopleList'
import { ParticipateFlow } from '@/components/projects/ParticipateFlow'
import { PROJECT_STATUS_LABEL, toOptions } from '@/components/projects/ProjectCard'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { Tag } from '@/components/ui/Tag'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/cn'
import { getContent } from '@/lib/content/source'
import { formatDayMonth, formatFullDate } from '@/lib/domain/dates'
import { visibleProjects } from '@/lib/domain/selectors'
import { territoryName } from '@/lib/domain/territories'
import { personalStore } from '@/lib/personal'
import { projectViews } from '@/lib/view/projects'

type Params = Promise<{ id: string }>

async function findProject(id: string) {
  const content = await getContent()
  return { content, project: visibleProjects(content.projects).find((p) => p.id === decodeURIComponent(id)) ?? null }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { project } = await findProject((await params).id)
  return { title: project?.title ?? 'Proyecto' }
}

export default async function ProjectPage({ params }: { params: Params }) {
  const user = await requireUser()
  const { content, project } = await findProject((await params).id)
  if (!project) notFound()

  const [view] = await projectViews([project], content.opportunities, user.id)
  if (!view) notFound()
  const canManage = can(user, 'manage.viewPeople', { territory: project.territory })
  const participants = canManage ? await personalStore().projectParticipants(project.id) : []
  const names = new Map(view.opportunities.map((o) => [o.opportunity.id, o.opportunity.name]))

  return (
    <>
      <section className="bg-night text-white">
        <Container className="pb-10 pt-4 md:pb-14 md:pt-8">
          <Link href="/participa" className="press -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-white/70 hover:text-white">
            <Icon name="arrowLeft" size={18} /> Participa
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Eyebrow tone="sky">
              {PROJECT_STATUS_LABEL[project.status]}
              {project.kind ? ` · ${project.kind}` : ''}
            </Eyebrow>
            <span className="eyebrow text-white/50">{territoryName(project.territory)}</span>
          </div>
          <h1 className="display mt-3 max-w-3xl text-[2.4rem] sm:text-5xl md:text-6xl">{project.title}</h1>
          <p className="mt-5 max-w-2xl whitespace-pre-line text-base leading-relaxed text-white/75">{project.description}</p>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-white/60">
            {view.participantCount > 0 ? (
              <span className="inline-flex items-center gap-2">
                <Icon name="users" size={17} className="text-sky" />
                {view.participantCount === 1 ? '1 persona se ha ofrecido' : `${view.participantCount} personas se han ofrecido`}
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                <Icon name="spark" size={17} className="text-sky" />
                Puedes ser la primera persona en sumarte
              </span>
            )}
            {project.expectedDate ? (
              <span className="inline-flex items-center gap-2">
                <Icon name="calendar" size={17} className="text-sky" />
                Previsto para el {formatFullDate(project.expectedDate)}
              </span>
            ) : null}
          </div>
        </Container>
      </section>

      <Container className="-mt-5 grid gap-5 pb-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <Card className="order-2 lg:order-1">
          <Eyebrow>Oportunidades</Eyebrow>
          <h2 className="mt-2 text-xl font-extrabold tracking-[-0.02em] text-night">Dónde puedes participar</h2>
          {view.opportunities.length === 0 ? (
            <p className="mt-4 text-sm text-slate">Todavía no se han definido ámbitos de colaboración. Vuelve pronto.</p>
          ) : (
            <ul className="mt-5 grid gap-3">
              {view.opportunities.map(({ opportunity, availability, chosen }) => (
                <li
                  key={opportunity.id}
                  className={cn('rounded-2xl border p-4 sm:p-5', chosen ? 'border-electric bg-electric-50' : 'border-line', !availability.isOpen && !chosen && 'opacity-60')}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[1.05rem] font-bold text-night">{opportunity.name}</span>
                    {chosen ? (
                      <Tag tone="electric">
                        <Icon name="check" size={12} strokeWidth={3} /> Te has ofrecido
                      </Tag>
                    ) : availability.isOpen ? (
                      <Tag tone="success">Abierto</Tag>
                    ) : (
                      <Tag>Cerrado</Tag>
                    )}
                  </div>
                  {opportunity.description ? <p className="mt-1.5 text-sm leading-relaxed text-slate">{opportunity.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs font-semibold text-slate">
                    {availability.participants > 0 ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="users" size={14} className="text-electric" />
                        {availability.participants === 1 ? '1 persona apuntada' : `${availability.participants} personas apuntadas`}
                      </span>
                    ) : null}
                    {opportunity.deadline ? (
                      <span className="inline-flex items-center gap-1.5">
                        <Icon name="clock" size={14} className="text-electric" />
                        Hasta el {formatDayMonth(opportunity.deadline)}
                      </span>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="order-1 lg:sticky lg:top-24 lg:order-2">
          <Eyebrow tone="slate">Tu participación</Eyebrow>
          <p className="mt-2 text-sm leading-relaxed text-slate">
            {view.participation
              ? 'Ya te has ofrecido. Puedes cambiar los ámbitos o retirarte cuando quieras.'
              : view.hasOpenOpportunities
                ? 'Apúntate en todos los ámbitos que quieras. Sin compromiso de horas: quien lo prepara te contará los detalles.'
                : 'La participación en este proyecto está cerrada.'}
          </p>
          <div className="mt-5">
            <ParticipateFlow projectId={project.id} projectTitle={project.title} options={toOptions(view)} participating={view.participation !== null} />
          </div>
        </Card>

        {canManage ? (
          <div className="order-3 lg:col-span-2">
            <PeopleList
              title="Gestión · Personas que se han ofrecido"
              people={participants}
              opportunityNames={names}
              empty="Todavía no se ha ofrecido nadie."
              note="Solo lo ve la dirección con permisos sobre este territorio. Contacta con estas personas por los canales habituales."
            />
          </div>
        ) : null}
      </Container>
    </>
  )
}
