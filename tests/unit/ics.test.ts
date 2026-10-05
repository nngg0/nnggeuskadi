import { describe, expect, it } from 'vitest'
import { buildIcs, escapeIcsText, foldIcsLine, googleCalendarUrl } from '@/lib/domain/ics'
import type { Activity } from '@/lib/domain/types'

const activity: Activity = {
  id: 'ACT-031',
  title: 'Encuentro NNGG Euskadi',
  description: 'Balance, prioridades; y picoteo, al terminar.',
  territory: 'euskadi',
  date: '2026-10-17',
  time: '18:30',
  place: 'Vitoria-Gasteiz · Palacio Europa',
  capacity: 80,
  registrationOpensAt: null,
  registrationClosesAt: null,
  status: 'confirmada',
  visible: true,
  featured: true,
}

describe('añadir al calendario', () => {
  it('genera un evento iCalendar con la hora de Madrid en UTC y 2 h de duración', () => {
    const ics = buildIcs(activity, { url: 'https://app.example/actividades/ACT-031', now: new Date('2026-10-05T10:00:00Z') })
    expect(ics).toContain('BEGIN:VEVENT')
    expect(ics).toContain('DTSTART:20261017T163000Z')
    expect(ics).toContain('DTEND:20261017T183000Z')
    expect(ics).toContain('UID:ACT-031@nngg-euskadi')
    expect(ics).toContain('SUMMARY:Encuentro NNGG Euskadi')
    expect(ics.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)).toBe(true)
  })

  it('sin hora es un evento de día completo', () => {
    const ics = buildIcs({ ...activity, time: null }, { url: 'https://app.example' })
    expect(ics).toContain('DTSTART;VALUE=DATE:20261017')
    expect(ics).toContain('DTEND;VALUE=DATE:20261018')
  })

  it('una actividad cancelada se marca como cancelada', () => {
    expect(buildIcs({ ...activity, status: 'cancelada' }, { url: 'https://app.example' })).toContain('STATUS:CANCELLED')
  })

  it('escapa y pliega el texto según la norma', () => {
    expect(escapeIcsText('a, b; c\nd\\e')).toBe('a\\, b\; c\\nd\\\\e')
    expect(foldIcsLine('x'.repeat(100)).split('\r\n ')).toHaveLength(2)
  })

  it('enlace de Google Calendar', () => {
    const url = new URL(googleCalendarUrl(activity, 'https://app.example'))
    expect(url.searchParams.get('dates')).toBe('20261017T163000Z/20261017T183000Z')
    expect(url.searchParams.get('text')).toBe('Encuentro NNGG Euskadi')
  })
})
