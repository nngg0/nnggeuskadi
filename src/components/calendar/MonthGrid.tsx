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
  campaignDay = null,
  campaignLabel = 'Campaña',
  campaignRange = null,
  hrefFor,
}: {
  month: string
  activities: Activity[]
  today: string
  selectedDay: string | null
  registeredIds: Set<string>
  /** Día de la campaña (p. ej. 29N): muy destacado. */
  campaignDay?: string | null
  /** Rótulo corto del día de campaña, p. ej. "29N". */
  campaignLabel?: string
  /** Periodo de campaña: en rojo. */
  campaignRange?: { start: string; end: string } | null
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
    <div className="rounded-[var(--radius-card)] border border-line bg-card p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href={hrefFor({ mes: shiftMonth(month, -1), dia: null })}
          className="press flex size-10 items-center justify-center rounded-full text-ink hover:bg-mist"
          aria-label="Mes anterior"
          scroll={false}
        >
          <Icon name="chevronLeft" size={22} />
        </Link>
        <h2 className="font-label text-lg font-semibold first-letter:uppercase text-ink">{formatMonthYear(month)}</h2>
        <Link
          href={hrefFor({ mes: shiftMonth(month, 1), dia: null })}
          className="press flex size-10 items-center justify-center rounded-full text-ink hover:bg-mist"
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
          const isCampaignDay = date === campaignDay
          const isPastDay = date < today
          const inCampaign = !isCampaignDay && campaignRange !== null && date >= campaignRange.start && date <= campaignRange.end
          const label = [
            String(i + 1),
            isCampaignDay ? 'día de la campaña' : inCampaign ? 'campaña electoral' : null,
            items.length ? `${items.length} ${items.length === 1 ? 'acto' : 'actos'}` : null,
          ]
            .filter(Boolean)
            .join(', ')
          const body = (
            <>
              <span className={cn(isCampaignDay ? 'font-display text-xl leading-none' : 'text-sm', items.length || isCampaignDay ? 'font-bold' : 'font-medium')}>
                {i + 1}
              </span>
              {isCampaignDay ? <span className="eyebrow !text-[0.5rem] leading-none">{campaignLabel}</span> : null}
              {items.length ? (
                <span className="flex h-2 gap-0.5">
                  {items.slice(0, 3).map((a) => (
                    <span
                      key={a.id}
                      className={cn(
                        'size-2 rounded-full',
                        selected || inCampaign ? 'bg-white' : isCampaignDay ? 'bg-night' : a.status === 'cancelada' ? 'bg-granate' : a.kind === 'junta' ? 'bg-junta' : registeredIds.has(a.id) ? 'bg-success' : 'bg-sky',
                      )}
                    />
                  ))}
                </span>
              ) : null}
            </>
          )
          const classes = cn(
            'relative flex aspect-square flex-col items-center justify-center gap-1 rounded-xl transition-colors',
            selected
              ? 'bg-electric text-white'
              : isCampaignDay
                ? 'z-10 scale-110 bg-flag-yellow text-night shadow-lg shadow-flag-yellow/40 ring-2 ring-white'
                : inCampaign
                  ? cn('bg-flag-red text-white', items.length ? 'ring-2 ring-inset ring-white/80' : 'bg-flag-red/70')
                  : items.length && isPastDay
                    ? 'bg-line/50 text-slate grayscale hover:bg-line'
                    : items.length
                      ? 'bg-electric/30 text-white ring-1 ring-inset ring-sky/60 hover:bg-electric/45'
                      : 'text-slate/70',
            isToday && !selected && 'ring-2 ring-inset ring-electric',
            mine && !selected && !isCampaignDay && !inCampaign && 'bg-success/30 ring-success/70',
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
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-md bg-electric/30 ring-1 ring-inset ring-sky/60" />Hay acto</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-success" />Estás inscrito</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-junta" />Junta directiva</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-md ring-2 ring-inset ring-electric" />Hoy</span>
        {campaignRange ? (
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-md bg-flag-red" />Campaña electoral</span>
        ) : null}
        {campaignDay ? (
          <span className="inline-flex items-center gap-1.5"><span className="size-3 rounded-md bg-flag-yellow" />{campaignLabel}</span>
        ) : null}
      </div>
    </div>
  )
}
