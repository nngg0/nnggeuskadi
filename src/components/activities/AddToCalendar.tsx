import { googleCalendarUrl } from '@/lib/domain/ics'
import type { Activity } from '@/lib/domain/types'
import { buttonClasses } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

/** Añadir la actividad al calendario del móvil (.ics) o a Google Calendar. */
export function AddToCalendar({ activity, url }: { activity: Activity; url: string }) {
  return (
    <div>
      <a
        href={`/actividades/${encodeURIComponent(activity.id)}/ics`}
        className={buttonClasses('secondary', 'md', true)}
      >
        <span>Añadir a mi calendario</span>
        <Icon name="calendar" size={18} />
      </a>
      <a
        href={googleCalendarUrl(activity, url)}
        target="_blank"
        rel="noopener noreferrer"
        className="press mt-2 inline-flex w-full items-center justify-center gap-1.5 text-xs font-semibold text-slate hover:text-electric"
      >
        o añadir a Google Calendar <Icon name="external" size={13} />
      </a>
    </div>
  )
}
