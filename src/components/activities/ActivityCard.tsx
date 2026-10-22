import Link from 'next/link'
import { cn } from '@/lib/cn'
import type { ActivityView } from '@/lib/view/activities'
import { Icon } from '@/components/ui/Icon'
import { CapacityMeter, DateBlock, JuntaTag, MetaLine, RegistrationTag, TerritoryLabel } from './ActivityBits'
import { AddToCalendar } from './AddToCalendar'

/**
 * Tarjeta de actividad para listas (Inicio, Actos, Perfil). Toda la tarjeta abre la ficha
 * (enlace estirado desde el título). En Actos lleva además los botones de calendario, por encima.
 * Los actos cancelados (en granate) y los que tienen los detalles por confirmar no se pueden abrir;
 * a quien puede editarlos se le muestra un botón «Editar» en la propia tarjeta.
 */
export function ActivityCard({
  view,
  withCalendar = false,
  canEdit = false,
  className,
}: {
  view: ActivityView
  withCalendar?: boolean
  canEdit?: boolean
  className?: string
}) {
  const { activity, state, registeredCount } = view
  const muted = state.kind === 'cancelled' || state.kind === 'past'
  const junta = activity.kind === 'junta'
  const cancelled = state.kind === 'cancelled'
  const tbc = state.kind === 'tbc'
  const locked = cancelled || tbc
  return (
    <article
      data-cancelado={cancelled || undefined}
      data-por-confirmar={tbc || undefined}
      className={cn(
        'group relative flex gap-4 rounded-[var(--radius-card)] border p-5 sm:p-6',
        cancelled
          ? 'border-granate/70 bg-granate-50'
          : tbc
            ? cn('border-dashed bg-card', junta ? 'border-junta/45' : 'border-line-strong')
            : cn(
                'press bg-card hover:border-electric/40',
                view.isRegistered && !muted ? 'border-success/35' : junta ? 'border-junta/45 hover:border-junta/70' : 'border-line',
                muted && 'opacity-75',
              ),
        className,
      )}
    >
      <DateBlock
        date={activity.date}
        tone={cancelled ? 'granate' : junta ? 'junta' : view.isRegistered && !muted ? 'electric' : 'night'}
        className="self-start"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TerritoryLabel territory={activity.territory} />
          <JuntaTag activity={activity} />
          <RegistrationTag state={state} />
        </div>
        <h3 className={cn('mt-2 font-label text-[1.08rem] font-semibold leading-snug', cancelled ? 'text-ink/70 line-through decoration-granate decoration-2' : 'text-ink')}>
          {locked ? (
            activity.title
          ) : (
            <Link
              href={`/actividades/${encodeURIComponent(activity.id)}`}
              className="after:absolute after:inset-0 after:rounded-[var(--radius-card)] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-3 focus-visible:after:outline-electric"
            >
              {activity.title}
            </Link>
          )}
        </h3>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {activity.time ? <MetaLine icon="clock">{activity.time}</MetaLine> : null}
          {activity.place ? <MetaLine icon="pin" className="max-w-full">{activity.place}</MetaLine> : null}
        </div>
        {!muted && !tbc ? (
          <>
            <div className="mt-4">
              <CapacityMeter count={registeredCount} capacity={activity.capacity} compact />
            </div>
            {withCalendar ? <AddToCalendar activity={activity} compact className="relative z-10 mt-4" /> : null}
          </>
        ) : null}
        {locked && canEdit ? (
          <Link
            href={`/actividades/${encodeURIComponent(activity.id)}/editar`}
            aria-label={`Editar ${activity.title}`}
            className="press relative z-10 mt-4 inline-flex items-center gap-1.5 rounded-full border border-line-strong px-3 py-1.5 text-xs font-bold text-ink hover:border-electric"
          >
            <Icon name="edit" size={14} /> Editar
          </Link>
        ) : null}
      </div>
      {locked ? null : (
        <Icon name="chevronRight" size={20} className="mt-1 hidden shrink-0 text-line-strong transition-colors group-hover:text-electric sm:block" />
      )}
    </article>
  )
}
