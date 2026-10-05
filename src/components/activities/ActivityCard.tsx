import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { ActivityView } from '@/lib/view/activities'
import { Icon } from '@/components/ui/Icon'
import { CapacityMeter, DateBlock, MetaLine, RegistrationTag, TerritoryLabel } from './ActivityBits'

/** Tarjeta de actividad para listas (Inicio, Calendario, Perfil). Toda la tarjeta abre la ficha. */
export function ActivityCard({ view, className }: { view: ActivityView; className?: string }) {
  const { activity, state, registeredCount } = view
  const muted = state.kind === 'cancelled' || state.kind === 'past'
  return (
    <Link
      href={`/actividades/${encodeURIComponent(activity.id)}`}
      className={cn(
        'press group flex gap-4 rounded-[var(--radius-card)] border bg-white p-5 hover:border-electric/40 sm:p-6',
        view.isRegistered && !muted ? 'border-success/35' : 'border-line',
        muted && 'opacity-75',
        className,
      )}
    >
      <DateBlock date={activity.date} tone={view.isRegistered && !muted ? 'electric' : 'night'} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TerritoryLabel territory={activity.territory} />
          <RegistrationTag state={state} />
        </div>
        <h3 className={cn('mt-2 text-[1.08rem] font-bold leading-snug tracking-[-0.01em] text-night', state.kind === 'cancelled' && 'line-through')}>
          {activity.title}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {activity.time ? <MetaLine icon="clock">{activity.time}</MetaLine> : null}
          {activity.place ? <MetaLine icon="pin" className="max-w-full">{activity.place}</MetaLine> : null}
        </div>
        {!muted ? (
          <div className="mt-4">
            <CapacityMeter count={registeredCount} capacity={activity.capacity} compact />
          </div>
        ) : null}
      </div>
      <Icon name="chevronRight" size={20} className="mt-1 hidden shrink-0 text-line-strong transition-colors group-hover:text-electric sm:block" />
    </Link>
  )
}
