import Link from 'next/link'
import { cn } from '@/lib/cn'
import { daysInMonth, formatMonthYear, isoWeekday, shiftMonth } from '@/lib/domain/dates'
import type { Activity } from '@/lib/domain/types'
import { Icon } from '@/components/ui/Icon'

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

/** Vista mensual. Navegación y selección de día mediante enlaces (?mes=, ?dia=), sin JavaScript. */
export function MonthGrid({
  month,
  activities,
  today,
  selectedDay,
  registeredIds,
  hrefFor,
}: {
  month: string
  activities: Activity[]
  today: string
  selectedDay: string | null
  registeredIds: Set<string>
  hrefFor: (params: { mes?: string; dia?: string | null }) => string
}) {
  const total = daysInMonth(month)
  const offset = isoWeekday(`${month}-01`) - 1
  const byDay = new Map<string, Activity[]>()
  for (const a of activities) {
    if (!a.date.startsWith(month)) continue
    byDay.set(a.date, [...(byDay.get(a.date) ?? []), a])
  }

  return (
    <div className="rounded-[var(--radius-card)] border border-line bg-white p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={hrefFor({ mes: shiftMonth(month, -1), dia: null })}
          className="press flex size-10 items-center justify-center rounded-full text-night hover:bg-mist"
          aria-label="Mes anterior"
          scroll={false}
        >
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h2 className="text-lg font-extrabold first-letter:uppercase tracking-[-0.02em] text-night">{formatMonthYear(month)}</h2>
        <Link
          href={hrefFor({ mes: shiftMonth(month, 1), dia: null })}
          className="press flex size-10 items-center justify-center rounded-full text-night hover:bg-mist"
          aria-label="Mes siguiente"
          scroll={false}
        >
          <Icon name="chevronRight" size={22} />
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center" role="grid" aria-label={formatMonthYear(month)}>
        {WEEKDAYS.map((d) => (
          <div key={d} className="eyebrow pb-2 !text-[0.6rem] text-slate" role="columnheader">
            {d}
          </div>
        ))}
        {Array.from({ length: offset }, (_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: total }, (_, i) => {
          const date = `${month}-${String(i + 1).padStart(2, '0')}`
          const items = byDay.get(date) ?? []
          const selected = date === selectedDay
          const isToday = date === today
          const mine = items.some((a) => registeredIds.has(a.id))
          const label = `${i + 1}${items.length ? `, ${items.length} ${items.length === 1 ? 'actividad' : 'actividades'}` : ''}`
          const body = (
            <>
              <span className={cn('text-sm', items.length ? 'font-bold' : 'font-medium')}>{i + 1}</span>
              <span className="flex h-1.5 gap-0.5">
                {items.slice(0, 3).map((a) => (
                  <span
                    key={a.id}
                    className={cn('size-1.5 rounded-full', selected ? 'bg-white' : registeredIds.has(a.id) ? 'bg-success' : 'bg-electric')}
                  />
                ))}
              </span>
            </>
          )
          const classes = cn(
            'flex aspect-square flex-col items-center justify-center gap-1 rounded-xl transition-colors',
            selected ? 'bg-night text-white' : items.length ? 'text-night hover:bg-electric-50' : 'text-slate/70',
            isToday && !selected && 'ring-2 ring-inset ring-electric',
            mine && !selected && 'bg-success-50',
          )
          return items.length ? (
            <Link key={date} href={hrefFor({ mes: month, dia: selected ? null : date })} className={cn('press', classes)} aria-label={label} aria-pressed={selected} scroll={false}>
              {body}
            </Link>
          ) : (
            <div key={date} className={classes} aria-label={label}>
              {body}
            </div>
          )
        })}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs text-slate">
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-electric" />Actividad</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" />Estás inscrito</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-md ring-2 ring-inset ring-electric" />Hoy</span>
      </div>
    </div>
  )
}
