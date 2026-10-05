import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { CapacityMeter, RegistrationTag } from '@/components/activities/ActivityBits'
import { RegistrationPanel } from '@/components/activities/RegistrationPanel'
import { PeopleList } from '@/components/profile/PeopleList'
import { Container } from '@/components/layout/PageHeader'
import { Card } from '@/components/ui/Card'
import { Eyebrow } from '@/components/ui/Eyebrow'
import { Icon } from '@/components/ui/Icon'
import { can } from '@/lib/auth/permissions'
import { requireUser } from '@/lib/auth/session'
import { getContent } from '@/lib/content/source'
import { formatDayMonth, formatInstant, formatWeekday } from '@/lib/domain/dates'
import { publicActivities } from '@/lib/domain/selectors'
import { territoryName } from '@/lib/domain/territories'
import { personalStore } from '@/lib/personal'
import { activityViews } from '@/lib/view/activities'

type Params = Promise<{ id: string }>

async function findActivity(id: string) {
  const content = await getContent()
  return publicActivities(content.activities).find((a) => a.id === decodeURIComponent(id)) ?? null
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const activity = await findActivity((await params).id)
  return { title: activity?.title ?? 'Actividad' }
}

export default async function ActivityPage({ params }: { params: Params }) {
  const user = await requireUser()
  const activity = await findActivity((await params).id)
  if (!activity) notFound()

  const [view] = await activityViews([activity], user.id)
  if (!view) notFound()
  const canManage = can(user, 'manage.viewPeople', { territory: activity.territory })
  const registrants = canManage ? await personalStore().eventRegistrants(activity.id) : []
  const label = view.state.kind === 'registered' ? 'Tu próximo plan' : activity.featured ? 'Próximo acto' : 'Actividad'

  return (
    <>
      <section className="bg-night text-white">
        <Container className="pb-10 pt-4 md:pb-14 md:pt-8">
          <Link href="/calendario" className="press -ml-2 inline-flex items-center gap-1 rounded-full px-2 py-1.5 text-sm font-semibold text-white/70 hover:text-white">
            <Icon name="arrowLeft" size={18} /> Calendario
          </Link>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Eyebrow tone="sky">{label}</Eyebrow>
            <span className="eyebrow text-white/50">{territoryName(activity.territory)}</span>
          </div>
          <h1 className="display mt-3 max-w-3xl text-[2.4rem] sm:text-5xl md:text-6xl">{activity.title}</h1>
          <dl className="mt-7 grid max-w-2xl gap-x-8 gap-y-4 sm:grid-cols-3">
            <div>
              <dt className="eyebrow !text-[0.6rem] text-white/50">Fecha</dt>
              <dd className="mt-1 text-lg font-bold">
                {formatDayMonth(activity.date)}
                <span className="block text-sm font-medium capitalize text-white/60">{formatWeekday(activity.date)}</span>
              </dd>
            </div>
            <div>
              <dt className="eyebrow !text-[0.6rem] text-white/50">Hora</dt>
              <dd className="mt-1 text-lg font-bold">{activity.time ?? 'Por confirmar'}</dd>
            </div>
            <div>
              <dt className="eyebrow !text-[0.6rem] text-white/50">Lugar</dt>
              <dd className="mt-1 text-lg font-bold leading-snug">{activity.place || 'Por confirmar'}</dd>
            </div>
          </dl>
        </Container>
      </section>

      <Container className="-mt-5 grid gap-5 pb-10 lg:grid-cols-[1fr_24rem] lg:items-start">
        <Card className="order-2 lg:order-1">
          <Eyebrow>Sobre la actividad</Eyebrow>
          <div className="mt-3 space-y-3 whitespace-pre-line text-[0.98rem] leading-relaxed text-ink/85">
            {activity.description || 'La organización todavía no ha añadido una descripción.'}
          </div>
          {activity.registrationOpensAt || activity.registrationClosesAt ? (
            <div className="mt-6 grid gap-2 border-t border-line pt-5 text-sm text-slate sm:grid-cols-2">
              {activity.registrationOpensAt ? (
                <p>
                  <span className="eyebrow block !text-[0.6rem]">Inscripción desde</span>
                  <span className="font-semibold text-night">{formatInstant(activity.registrationOpensAt)}</span>
                </p>
              ) : null}
              {activity.registrationClosesAt ? (
                <p>
                  <span className="eyebrow block !text-[0.6rem]">Inscripción hasta</span>
                  <span className="font-semibold text-night">{formatInstant(activity.registrationClosesAt)}</span>
                </p>
              ) : null}
            </div>
          ) : null}
        </Card>

        <Card className="order-1 lg:sticky lg:top-24 lg:order-2">
          <div className="flex items-center justify-between gap-3">
            <Eyebrow tone="slate">Inscripción</Eyebrow>
            <RegistrationTag state={view.state} />
          </div>
          <div className="mt-4">
            <CapacityMeter count={view.registeredCount} capacity={activity.capacity} />
          </div>
          <div className="mt-6">
            <RegistrationPanel activityId={activity.id} state={view.state} />
          </div>
        </Card>

        {canManage ? (
          <div className="order-3 lg:col-span-2">
            <PeopleList
              title="Gestión · Inscritos"
              people={registrants}
              empty="Todavía no hay nadie inscrito."
              note="Solo lo ve la dirección con permisos sobre este territorio. No compartas estos datos fuera de la organización."
            />
          </div>
        ) : null}
      </Container>
    </>
  )
}
