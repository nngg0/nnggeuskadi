import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { formatDayMonth, formatMonthShort, formatWeekdayShort } from '@/lib/domain/dates'
import type { RegistrationState } from '@/lib/domain/registration'
import { territoryName, type TerritoryId } from '@/lib/domain/territories'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Tag } from '@/components/ui/Tag'

/** Bloque de fecha: "VIE / 17 / OCT". */
export function DateBlock({ date, className, tone = 'night' }: { date: string; className?: string; tone?: 'night' | 'electric' | 'light' }) {
  const tones = {
    night: 'bg-night text-white',
    electric: 'bg-electric text-white',
    light: 'bg-mist text-night',
  }
  return (
    <div className={cn('flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2.5', tones[tone], className)}>
      <span className="eyebrow !text-[0.58rem] opacity-70">{formatWeekdayShort(date)}</span>
      <span className="text-[1.65rem] font-extrabold leading-none tracking-[-0.04em]">{Number(date.slice(8, 10))}</span>
      <span className="eyebrow mt-0.5 !text-[0.58rem] opacity-70">{formatMonthShort(date)}</span>
    </div>
  )
}

export function MetaLine({ icon, children, className }: { icon: IconName; children: ReactNode; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[0.85rem] text-slate', className)}>
      <Icon name={icon} size={16} className="shrink-0 text-electric" />
      <span className="truncate">{children}</span>
    </span>
  )
}

export function TerritoryLabel({ territory, className }: { territory: TerritoryId; className?: string }) {
  return <span className={cn('eyebrow text-slate', className)}>{territoryName(territory)}</span>
}

/** "62 inscritos · 80 plazas" con barra fina de ocupación. */
export function CapacityMeter({ count, capacity, compact = false }: { count: number; capacity: number | null; compact?: boolean }) {
  if (capacity === null) {
    return <MetaLine icon="users">{count === 1 ? '1 inscrito' : `${count} inscritos`} · sin límite de plazas</MetaLine>
  }
  const ratio = Math.min(1, count / capacity)
  const full = count >= capacity
  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3 text-[0.85rem]">
        <span className="inline-flex items-center gap-1.5 text-slate">
          <Icon name="users" size={16} className="text-electric" />
          <span>
            <strong className="font-bold text-night">{count}</strong> {count === 1 ? 'inscrito' : 'inscritos'} · {capacity} plazas
          </span>
        </span>
        {!compact && !full && capacity - count <= Math.max(3, capacity * 0.15) ? (
          <span className="eyebrow !text-[0.6rem] text-warning">Últimas {capacity - count}</span>
        ) : null}
      </div>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden>
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', full ? 'bg-slate' : 'bg-electric')}
          style={{ width: `${Math.max(4, ratio * 100)}%` }}
        />
      </div>
    </div>
  )
}

export function RegistrationTag({ state }: { state: RegistrationState }) {
  switch (state.kind) {
    case 'registered':
      return (
        <Tag tone="success">
          <Icon name="check" size={12} strokeWidth={3} /> Estás inscrito
        </Tag>
      )
    case 'full':
      return <Tag tone="neutral">Completo</Tag>
    case 'closed':
      return <Tag tone="neutral">Inscripción cerrada</Tag>
    case 'not_open':
      return <Tag tone="warning">Abre el {formatDayMonth(state.opensAt.slice(0, 10))}</Tag>
    case 'cancelled':
      return <Tag tone="danger">Cancelada</Tag>
    case 'past':
      return <Tag tone="neutral">{state.wasRegistered ? 'Asististe' : 'Finalizada'}</Tag>
    case 'open':
      return state.remaining !== null && state.remaining <= 5 ? (
        <Tag tone="warning">Quedan {state.remaining}</Tag>
      ) : (
        <Tag tone="electric">Inscripción abierta</Tag>
      )
  }
}
