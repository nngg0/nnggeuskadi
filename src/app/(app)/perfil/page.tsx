import type { Metadata } from 'next'
import Link from 'next/link'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { RegistrationTag } from '@/components/activities/ActivityBits'
import { DocumentRow } from '@/components/documents/DocumentRow'
import { Container } from '@/components/layout/PageHeader'
import { InterestsForm } from '@/components/profile/InterestsForm'
import { ProfileForm } from '@/components/profile/ProfileForm'
import { InstallButton } from '@/components/pwa/InstallButton'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Eyebrow, SectionHeader } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { signOut } from '@/lib/actions/auth'
import { can, canListMembers, ROLE_LABELS } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/config/mode'
import { getContent } from '@/lib/content/source'
import { formatMonthShort } from '@/lib/domain/dates'
import { sortByDate } from '@/lib/domain/selectors'
import { territoryName } from '@/lib/domain/territories'
import { personalStore } from '@/lib/personal'
import { activityViews } from '@/lib/view/activities'
import { projectViews } from '@/lib/view/projects'

export const metadata: Metadata = { title: 'Perfil' }

const SECTIONS = [
  { id: 'intereses', label: 'Intereses' },
  { id: 'proximas', label: 'Próximas' },
  { id: 'inscripciones', label: 'Inscripciones' },
  { id: 'participaciones', label: 'Participaciones' },
  { id: 'guardados', label: 'Guardados' },
  { id: 'configuracion', label: 'Configuración' },
]

export default async function ProfilePage() {
  const user = await requireUser()
  const content = await getContent()
  const store = personalStore()
  const [registrations, participations, savedIds] = await Promise.all([
    store.myRegistrations(user.id),
    store.myParticipations(user.id),
    store.savedDocumentIds(user.id),
  ])

  const registeredIds = new Set(registrations.map((r) => r.eventId))
  const registeredActivities = sortByDate(content.activities.filter((a) => registeredIds.has(a.id)))
  const views = await activityViews(registeredActivities, user.id)
  const upcoming = views.filter((v) => v.state.kind === 'registered')
  const participatingProjects = content.projects.filter((p) => participations.some((x) => x.projectId === p.id))
  const pViews = await projectViews(participatingProjects, content.opportunities, user.id)
  const isAdmin = can(user, 'members.approve')
  const pendingRequests = isAdmin ? (await store.listAccessRequests()).length : 0
  const savedDocs = savedIds
    .map((id) => content.documents.find((d) => d.id === id && d.visible))
    .filter((d): d is NonNullable<typeof d> => Boolean(d))

  return (
    <>
      <section className="bg-night text-white">
        <Container className="pb-8 pt-6 md:pb-10 md:pt-10">
          <Eyebrow tone="sky">Perfil</Eyebrow>
          <h1 className="display mt-3 text-[2.35rem] sm:text-5xl">{user.displayName}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 font-semibold">
              <Icon name="territory" size={16} className="text-sky" />
              {territoryName(user.territory)}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5 font-semibold text-white/80">{ROLE_LABELS[user.role]}</span>
          </div>
          <dl className="mt-7 grid max-w-xl grid-cols-3 gap-3">
            {[
              { n: upcoming.length, l: 'Próximas' },
              { n: participations.length, l: 'Participas' },
              { n: savedDocs.length, l: 'Guardados' },
            ].map((s) => (
              <div key={s.l} className="rounded-2xl border border-white/10 px-4 py-3">
                <dd className="text-2xl font-extrabold tracking-[-0.03em]">{s.n}</dd>
                <dt className="eyebrow !text-[0.58rem] text-white/55">{s.l}</dt>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      <nav aria-label="Secciones del perfil" className="sticky top-14 z-30 border-b border-line bg-mist/95 backdrop-blur md:top-16">
        <Container className="scrollbar-none flex gap-1 overflow-x-auto py-2">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="press shrink-0 rounded-full px-3.5 py-2 text-xs font-bold text-slate hover:bg-white hover:text-night">
              {s.label}
            </a>
          ))}
        </Container>
      </nav>

      <Container className="space-y-12 py-8 md:py-10">
        {isAdmin || canListMembers(user) ? (
          <section id="gestion" className="scroll-mt-32">
            <SectionHeader eyebrow="Gestión" />
            <div className="grid gap-3 md:grid-cols-2">
              {isAdmin ? (
                <Link href="/solicitudes" className="press flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 hover:border-electric/40">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-electric-50 text-electric">
                    <Icon name="user" size={22} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-night">Solicitudes de acceso</span>
                    <span className="text-sm text-slate">{pendingRequests === 0 ? 'Ninguna pendiente' : pendingRequests === 1 ? '1 pendiente' : `${pendingRequests} pendientes`}</span>
                  </span>
                  {pendingRequests > 0 ? <span className="flex size-7 items-center justify-center rounded-full bg-electric text-xs font-bold text-white">{pendingRequests}</span> : null}
                </Link>
              ) : null}
              {canListMembers(user) ? (
                <Link href="/miembros" className="press flex items-center gap-4 rounded-[var(--radius-card)] border border-line bg-white p-5 hover:border-electric/40">
                  <span className="flex size-11 items-center justify-center rounded-2xl bg-electric-50 text-electric">
                    <Icon name="users" size={22} />
                  </span>
                  <span className="flex-1">
                    <span className="block font-bold text-night">Miembros</span>
                    <span className="text-sm text-slate">Listado de afiliados con acceso</span>
                  </span>
                  <Icon name="chevronRight" size={20} className="text-slate" />
                </Link>
              ) : null}
            </div>
          </section>
        ) : null}

        <section id="intereses" className="scroll-mt-32">
          <SectionHeader eyebrow="Mis intereses" title="Lo que más te mueve." />
          <Card>
            <InterestsForm initial={user.interests} />
          </Card>
        </section>

        <section id="proximas" className="scroll-mt-32">
          <SectionHeader eyebrow="Mis próximas actividades" title={upcoming.length ? 'Tus planes.' : undefined} />
          {upcoming.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {upcoming.map((v) => (
                <ActivityCard key={v.activity.id} view={v} />
              ))}
            </div>
          ) : (
            <EmptyState title="Todavía no tienes ningún plan" icon="calendar" action={{ href: '/calendario', label: 'Ver calendario' }}>
              Cuando te inscribas en una actividad aparecerá aquí.
            </EmptyState>
          )}
        </section>

        <section id="inscripciones" className="scroll-mt-32">
          <SectionHeader eyebrow="Mis inscripciones" />
          {views.length > 0 ? (
            <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-card)] border border-line bg-white">
              {views.map((v) => (
                <li key={v.activity.id}>
                  <Link href={`/actividades/${encodeURIComponent(v.activity.id)}`} className="press flex items-center gap-4 px-5 py-4 hover:bg-mist/50">
                    <span className="w-14 shrink-0 text-sm font-extrabold uppercase text-night">
                      {Number(v.activity.date.slice(8, 10))} {formatMonthShort(v.activity.date)}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-night">{v.activity.title}</span>
                    <RegistrationTag state={v.state} />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin inscripciones" icon="ticket" action={{ href: '/calendario', label: 'Ver calendario' }}>
              Aquí verás el histórico de actividades en las que te has inscrito.
            </EmptyState>
          )}
        </section>

        <section id="participaciones" className="scroll-mt-32">
          <SectionHeader eyebrow="Mis participaciones" title={pViews.length ? 'En esto estás echando una mano.' : undefined} />
          {pViews.length > 0 ? (
            <ul className="grid gap-3 md:grid-cols-2">
              {pViews.map((v) => (
                <li key={v.project.id}>
                  <Link href={`/participa/${encodeURIComponent(v.project.id)}`} className="press block rounded-[var(--radius-card)] border border-line bg-white p-5 hover:border-electric/40">
                    <span className="eyebrow !text-[0.6rem] text-electric">{territoryName(v.project.territory)}</span>
                    <span className="mt-1.5 block text-lg font-extrabold tracking-[-0.02em] text-night">{v.project.title}</span>
                    <span className="mt-3 flex flex-wrap gap-1.5">
                      {v.opportunities
                        .filter((o) => o.chosen)
                        .map((o) => (
                          <span key={o.opportunity.id} className="rounded-full bg-electric-50 px-2.5 py-1 text-xs font-semibold text-electric">
                            {o.opportunity.name}
                          </span>
                        ))}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Aún no participas en ninguna iniciativa" icon="participa" action={{ href: '/participa', label: 'Ver qué estamos preparando' }}>
              Ofrécete en algo que se esté preparando y lo verás aquí.
            </EmptyState>
          )}
        </section>

        <section id="guardados" className="scroll-mt-32">
          <SectionHeader eyebrow="Documentos guardados" />
          {savedDocs.length > 0 ? (
            <ul className="grid gap-2.5 lg:grid-cols-2">
              {savedDocs.map((d) => (
                <DocumentRow key={d.id} document={d} saved />
              ))}
            </ul>
          ) : (
            <EmptyState title="No tienes documentos guardados" icon="bookmark" action={{ href: '/documentos', label: 'Ir a documentos' }}>
              Guarda los documentos que más uses para tenerlos siempre a mano.
            </EmptyState>
          )}
        </section>

        <section id="configuracion" className="scroll-mt-32">
          <SectionHeader eyebrow="Configuración" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <ProfileForm displayName={user.displayName} notifyNewInitiatives={user.settings.notifyNewInitiatives} />
            </Card>
            <Card className="grid content-start gap-6">
              <div>
                <p className="eyebrow !text-[0.62rem] text-slate">Cuenta</p>
                <p className="mt-1 font-semibold text-night">{user.email}</p>
              </div>
              <div>
                <p className="eyebrow mb-2 !text-[0.62rem] text-slate">App en tu móvil</p>
                <InstallButton />
              </div>
              <div className="flex flex-wrap gap-2">
                {!isDemoMode ? (
                  <Link href="/actualizar-clave" className={buttonClasses('secondary', 'md')}>
                    Cambiar contraseña
                  </Link>
                ) : null}
                <form action={signOut}>
                  <button type="submit" className={buttonClasses('secondary', 'md')}>
                    <span>Cerrar sesión</span>
                    <Icon name="logout" size={18} />
                  </button>
                </form>
              </div>
            </Card>
          </div>
        </section>
      </Container>
    </>
  )
}
