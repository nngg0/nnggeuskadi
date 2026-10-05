import type { Activity } from './types'
import { addDays, madridToInstant } from './dates'

/*
 * "Añadir a mi calendario": evento iCalendar (RFC 5545) y enlace de Google Calendar.
 * Sin hora fijada, el evento es de día completo. Sin hora de fin en el Sheet, se asume 2 horas.
 */

const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000

function utcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

function dateStamp(date: string): string {
  return date.replace(/-/g, '')
}

/** Escapa texto según RFC 5545. */
export function escapeIcsText(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n')
}

/** Pliega líneas largas (máx. 75 octetos) sin partir caracteres UTF-8. */
export function foldIcsLine(line: string): string {
  const encoder = new TextEncoder()
  const parts: string[] = []
  let current = ''
  let bytes = 0
  for (const char of line) {
    const size = encoder.encode(char).length
    const limit = parts.length === 0 ? 75 : 74
    if (bytes + size > limit) {
      parts.push(current)
      current = ''
      bytes = 0
    }
    current += char
    bytes += size
  }
  parts.push(current)
  return parts.join('\r\n ')
}

export function eventTimes(activity: Pick<Activity, 'date' | 'time'>) {
  if (!activity.time) return { allDay: true as const, start: activity.date, end: addDays(activity.date, 1) }
  const start = madridToInstant(activity.date, activity.time)
  return { allDay: false as const, start, end: new Date(start.getTime() + DEFAULT_DURATION_MS) }
}

export function buildIcs(activity: Activity, options: { url: string; now?: Date }): string {
  const times = eventTimes(activity)
  const description = [activity.description, `Más información: ${options.url}`].filter(Boolean).join('\n\n')
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NNGG Euskadi//Intranet//ES',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${activity.id}@nngg-euskadi`,
    `DTSTAMP:${utcStamp(options.now ?? new Date())}`,
    times.allDay ? `DTSTART;VALUE=DATE:${dateStamp(times.start)}` : `DTSTART:${utcStamp(times.start)}`,
    times.allDay ? `DTEND;VALUE=DATE:${dateStamp(times.end)}` : `DTEND:${utcStamp(times.end)}`,
    `SUMMARY:${escapeIcsText(activity.title)}`,
    activity.place ? `LOCATION:${escapeIcsText(activity.place)}` : null,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `URL:${options.url}`,
    `STATUS:${activity.status === 'cancelada' ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM',
    'TRIGGER:-PT2H',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeIcsText(activity.title)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter((l): l is string => l !== null)
  return lines.map(foldIcsLine).join('\r\n') + '\r\n'
}

export function googleCalendarUrl(activity: Activity, url: string): string {
  const times = eventTimes(activity)
  const dates = times.allDay
    ? `${dateStamp(times.start)}/${dateStamp(times.end)}`
    : `${utcStamp(times.start)}/${utcStamp(times.end)}`
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: activity.title,
    dates,
    details: [activity.description, url].filter(Boolean).join('\n\n'),
    location: activity.place,
    ctz: 'Europe/Madrid',
  })
  return `https://calendar.google.com/calendar/render?${params}`
}
