import type { Metadata } from 'next'
import Link from 'next/link'
import { ActivityCard } from '@/components/activities/ActivityCard'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { Container, PageHeader } from '@/components/layout/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/States'
import { TerritoryFilter } from '@/components/ui/TerritoryFilter'
import { requireUser } from '@/lib/auth/session'
import { cn } from '@/lib/cn'
import { getContent } from '@/lib/content/source'
import { formatMonthYear, formatRelativeDay, isIsoDate, isMonthKey, madridDate, monthKey } from '@/lib/domain/dates'
import { filterActivitiesByTerritory, publicActivities, sortByDate, upcomingActivities } from '@/lib/domain/selectors'
import { parseTerritoryFilter } from '@/lib/domain/territories'
import { personalStore } from '@/lib/personal'
import { activityViews, type ActivityView } from '@/lib/view/activities'

export const metadata: Metadata = { title: 'Calendario' }

type Search = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

function groupByMonth(views: ActivityView[]): [string, ActivityView[]][] {
  const groups = new Map<string, ActivityView[]>()
  for (const v of views) groups.set(monthKey(v.activity.date), [...(groups.get(monthKey(v.activity.date)) ?? []), v])
  return [...groups.entries()]
}

export default async function CalendarPage({ searchParams }: { searchParams: Search }) {
  const user = await requireUser()
  const params = await searchParams
  const content = await getContent()
  const now = new Date()
  const today = madridDate(now)

  const territory = parseTerritoryFilter(first(params.t))
  const view = first(params.vista) === 'mes' ? 'mes' : 'lista'
  const month = isMonthKey(first(params.mes)) ? first(params.mes)! : monthKey(today)
  const dayParam = first(params.dia)
  const selectedDay = dayParam && isIsoDate(dayParam) && dayParam.startsWith(month) ? dayParam : null

  const hrefFor = (next: { vista?: string; mes?: string; dia?: string | null }) => {
    const q = new URLSearchParams()
    if (territory !== 'todos') q.set('t', territory)
    const v = next.vista ?? view
    if (v === 'mes') q.set('vista', 'mes')
    if (v === 'mes' && (next.mes ?? month) !== monthKey(today)) q.set('mes', next.mes ?? month)
    if (v === 'mes' && next.dia) q.set('dia', next.dia)
    const qs = q.toString()
    return qs ? `/calendario?${qs}` : '/calendario'
  }

  const listActivities =
    view === 'lista'
      ? filterActivitiesByTerritory(upcomingActivities(content.activities, now), territory)
      : sortByDate(
          filterActivitiesByTerritory(publicActivities(content.activities), territory).filter((a) =>
            selectedDay ? a.date === selectedDay : a.date.startsWith(month),
          ),
        )
  const views = await activityViews(listActivities, user.id, now)
  const registeredIds = new Set(views.filter((v) => v.isRegistered).map((v) => v.activity.id))
  const monthActivities = view === 'mes' ? filterActivitiesByTerritory(publicActivities(content.activities), territory) : []
  const monthRegistered =
    view === 'mes' ? new Set((await personalStore().myRegistrations(user.id)).map((r) => r.eventId)) : registeredIds

  return (
    <>
      <PageHeader eyebrow="Calendario" title="Lo que viene.">
        Todas las actividades de NNGG Euskadi. Las de tu territorio están marcadas en el filtro.
      </PageHeader>

      <Container className="py-6 md:py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <TerritoryFilter value={territory} territories={content.territories} userTerritory={user.territory} resetParams={['dia']} />
          <div className="inline-flex self-start rounded-full border border-line-strong bg-white p-1" role="tablist" aria-label="Vista">
            {(['lista', 'mes'] as const).map((v) => (
              <Link
                key={v}
                href={hrefFor({ vista: v, dia: null })}
                role="tab"
                aria-selected={view === v}
                className={cn(
                  'press inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold',
                  view === v ? 'bg-electric text-white' : 'text-slate hover:text-night',
                )}
              >
                <Icon name={v === 'lista' ? 'list' : 'grid'} size={16} />
                {v === 'lista' ? 'Próximas' : 'Mes'}
              </Link>
            ))}
          </div>
        </div>

        {view === 'mes' ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,26rem)_1fr] lg:items-start">
            <MonthGrid
              month={month}
              activities={monthActivities}
              today={today}
              selectedDay={selectedDay}
              registeredIds={monthRegistered}
              hrefFor={(p) => hrefFor({ vista: 'mes', mes: p.mes, dia: p.dia ?? null })}
            />
            <div>
              <p className="eyebrow mb-3 text-slate">
                {selectedDay ? formatRelativeDay(selectedDay, today) : `Todo ${formatMonthYear(month)}`}
                {' · '}
                {views.length} {views.length === 1 ? 'actividad' : 'actividades'}
              </p>
              {views.length > 0 ? (
                <div className="grid gap-3">
                  {views.map((v) => (
                    <ActivityCard key={v.activity.id} view={v} className="animate-rise" />
                  ))}
                </div>
              ) : (
                <EmptyState title="Sin actividades este mes" icon="calendar">
                  Prueba con otro mes o cambia el filtro de territorio.
                </EmptyState>
              )}
            </div>
          </div>
        ) : views.length > 0 ? (
          <div className="mt-6 space-y-8">
            {groupByMonth(views).map(([key, items]) => (
              <section key={key}>
                <h2 className="eyebrow mb-3 text-slate">{formatMonthYear(key)}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {items.map((v) => (
                    <ActivityCard key={v.activity.id} view={v} className="animate-rise" />
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <EmptyState
            className="mt-6"
            title="No hay actividades próximas"
            icon="calendar"
            action={territory !== 'todos' ? { href: '/calendario', label: 'Ver todos los territorios' } : { href: '/participa', label: 'Ver qué estamos preparando' }}
          >
            {territory !== 'todos'
              ? 'No hay actividades programadas en este territorio. Prueba a ver todos.'
              : 'Todavía no hay nada programado. Lo que se está preparando lo verás antes en Participa.'}
          </EmptyState>
        )}
      </Container>
    </>
  )
}
