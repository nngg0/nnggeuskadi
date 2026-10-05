/**
 * Utilidades de fecha. Toda la lógica de calendario se calcula en hora de Madrid,
 * independientemente de la zona horaria del servidor.
 */
export const TIME_ZONE = 'Europe/Madrid'
export const LOCALE = 'es-ES'

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/
const TIME_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/

export function isIsoDate(value: string): boolean {
  const m = DATE_RE.exec(value)
  if (!m) return false
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3])
}

export function isTime(value: string): boolean {
  return TIME_RE.test(value)
}

const partsFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: TIME_ZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

function zonedParts(instant: Date) {
  const parts = Object.fromEntries(partsFormatter.formatToParts(instant).map((p) => [p.type, p.value]))
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
  }
}

/** Diferencia (ms) entre la hora de Madrid y UTC en un instante dado. */
function offsetAt(instant: Date): number {
  const p = zonedParts(instant)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(instant.getTime() / 1000) * 1000
}

/** Convierte fecha + hora locales de Madrid en un instante absoluto. */
export function madridToInstant(date: string, time = '00:00'): Date {
  const [y, mo, d] = date.split('-').map(Number) as [number, number, number]
  const [h, mi] = time.split(':').map(Number) as [number, number]
  const guess = Date.UTC(y, mo - 1, d, h, mi)
  const first = guess - offsetAt(new Date(guess))
  // Segunda pasada para los cambios de horario de verano/invierno.
  return new Date(guess - offsetAt(new Date(first)))
}

/** Fecha (YYYY-MM-DD) en Madrid para un instante. */
export function madridDate(instant: Date): string {
  const p = zonedParts(instant)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const dt = new Date(Date.UTC(y, m - 1, d + days))
  return dt.toISOString().slice(0, 10)
}

/** Día de la semana ISO (1 = lunes ... 7 = domingo) de una fecha YYYY-MM-DD. */
export function isoWeekday(date: string): number {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  const day = new Date(Date.UTC(y, m - 1, d)).getUTCDay()
  return day === 0 ? 7 : day
}

/** Lunes y domingo de la semana que contiene la fecha. */
export function weekRange(date: string): { start: string; end: string } {
  const start = addDays(date, 1 - isoWeekday(date))
  return { start, end: addDays(start, 6) }
}

export function monthKey(date: string): string {
  return date.slice(0, 7)
}

export function isMonthKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(value)
}

export function shiftMonth(key: string, delta: number): string {
  const [y, m] = key.split('-').map(Number) as [number, number]
  const dt = new Date(Date.UTC(y, m - 1 + delta, 1))
  return dt.toISOString().slice(0, 7)
}

export function daysInMonth(key: string): number {
  const [y, m] = key.split('-').map(Number) as [number, number]
  return new Date(Date.UTC(y, m, 0)).getUTCDate()
}

function utcNoon(date: string): Date {
  const [y, m, d] = date.split('-').map(Number) as [number, number, number]
  return new Date(Date.UTC(y, m - 1, d, 12))
}

const fmtDayMonth = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', timeZone: 'UTC' })
const fmtWeekday = new Intl.DateTimeFormat(LOCALE, { weekday: 'long', timeZone: 'UTC' })
const fmtWeekdayShort = new Intl.DateTimeFormat(LOCALE, { weekday: 'short', timeZone: 'UTC' })
const fmtMonthShort = new Intl.DateTimeFormat(LOCALE, { month: 'short', timeZone: 'UTC' })
const fmtMonthYear = new Intl.DateTimeFormat(LOCALE, { month: 'long', year: 'numeric', timeZone: 'UTC' })
const fmtFull = new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })

/** "17 de octubre" */
export function formatDayMonth(date: string): string {
  return fmtDayMonth.format(utcNoon(date))
}

/** "17 de octubre de 2026" */
export function formatFullDate(date: string): string {
  return fmtFull.format(utcNoon(date))
}

/** "viernes" */
export function formatWeekday(date: string): string {
  return fmtWeekday.format(utcNoon(date))
}

/** "vie" */
export function formatWeekdayShort(date: string): string {
  return fmtWeekdayShort.format(utcNoon(date)).replace('.', '')
}

/** "oct" */
export function formatMonthShort(date: string): string {
  return fmtMonthShort.format(utcNoon(date)).replace('.', '')
}

/** "octubre de 2026" */
export function formatMonthYear(key: string): string {
  return fmtMonthYear.format(utcNoon(`${key}-01`))
}

/** Fecha relativa breve: "Hoy", "Mañana" o "viernes 17 de octubre". */
export function formatRelativeDay(date: string, today: string): string {
  if (date === today) return 'Hoy'
  if (date === addDays(today, 1)) return 'Mañana'
  return `${formatWeekday(date)} ${formatDayMonth(date)}`
}

/** Fecha y hora de un instante en Madrid: "17 de octubre, 18:30". */
export function formatInstant(iso: string): string {
  const instant = new Date(iso)
  const p = zonedParts(instant)
  const date = madridDate(instant)
  return `${formatDayMonth(date)}, ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`
}
