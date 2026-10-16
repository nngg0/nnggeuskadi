import { siteUrl } from '@/lib/config/env'
import { cn } from '@/lib/cn'
import { googleCalendarUrl } from '@/lib/domain/ics'
import type { Activity } from '@/lib/domain/types'
import { buttonClasses } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

/**
 * Añadir el acto al calendario del iPhone (.ics, que también abren Android y Outlook) o a Google Calendar.
 * `compact` es la versión de las tarjetas de lista.
 */
export function AddToCalendar({ activity, compact = false, className }: { activity: Activity; compact?: boolean; className?: string }) {
  const path = `/actividades/${encodeURIComponent(activity.id)}`
  const size = compact ? 'sm' : 'md'
  return (
    <div className={cn('grid grid-cols-2 gap-2', className)}>
      <a
        href={`${path}/ics`}
        aria-label={`Añadir «${activity.title}» al calendario del iPhone`}
        className={cn(buttonClasses('secondary', size, true), '!justify-center')}
      >
        <Icon name="calendar" size={compact ? 16 : 18} className="shrink-0" />
        <span className="truncate">iPhone</span>
      </a>
      <a
        href={googleCalendarUrl(activity, `${siteUrl()}${path}`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Añadir «${activity.title}» a Google Calendar`}
        className={cn(buttonClasses('secondary', size, true), '!justify-center')}
      >
        <Icon name="external" size={compact ? 15 : 17} className="shrink-0" />
        <span className="truncate">{compact ? 'Google' : 'Google Calendar'}</span>
      </a>
    </div>
  )
}
