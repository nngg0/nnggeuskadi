import { describe, expect, it } from 'vitest'
import { getRegistrationState } from '@/lib/domain/registration'
import type { Activity } from '@/lib/domain/types'

const now = new Date('2026-10-05T10:00:00Z')

function activity(overrides: Partial<Activity> = {}): Activity {
  return {
    id: 'ACT-1',
    title: 'Encuentro',
    description: '',
    territory: 'euskadi',
    date: '2026-10-17',
    time: '18:30',
    place: 'Vitoria-Gasteiz',
    capacity: 80,
    registrationOpensAt: '2026-10-01T00:00:00.000Z',
    registrationClosesAt: '2026-10-15T21:59:00.000Z',
    status: 'confirmada',
    visible: true,
    featured: false,
    ...overrides,
  }
}

const ctx = (registeredCount = 0, isRegistered = false) => ({ registeredCount, isRegistered, now })

describe('getRegistrationState', () => {
  it('abierta con plazas restantes', () => {
    expect(getRegistrationState(activity(), ctx(62))).toEqual({ kind: 'open', remaining: 18 })
  })

  it('sin límite de plazas', () => {
    expect(getRegistrationState(activity({ capacity: null }), ctx(500))).toEqual({ kind: 'open', remaining: null })
  })

  it('completa cuando se alcanza el aforo', () => {
    expect(getRegistrationState(activity({ capacity: 10 }), ctx(10)).kind).toBe('full')
    expect(getRegistrationState(activity({ capacity: 10 }), ctx(12)).kind).toBe('full')
  })

  it('todavía no abierta', () => {
    const state = getRegistrationState(activity({ registrationOpensAt: '2026-10-08T00:00:00.000Z' }), ctx())
    expect(state).toEqual({ kind: 'not_open', opensAt: '2026-10-08T00:00:00.000Z' })
  })

  it('cerrada por fecha (cierre automático)', () => {
    expect(getRegistrationState(activity({ registrationClosesAt: '2026-10-04T00:00:00.000Z' }), ctx()).kind).toBe('closed')
  })

  it('cerrada manualmente por estado', () => {
    expect(getRegistrationState(activity({ status: 'cerrada' }), ctx()).kind).toBe('closed')
  })

  it('usuario ya inscrito: puede cancelar aunque esté completa o cerrada', () => {
    expect(getRegistrationState(activity({ capacity: 5 }), ctx(5, true))).toEqual({ kind: 'registered', canCancel: true })
    expect(getRegistrationState(activity({ status: 'cerrada' }), ctx(1, true)).kind).toBe('registered')
  })

  it('actividad cancelada prevalece', () => {
    expect(getRegistrationState(activity({ status: 'cancelada' }), ctx(3, true)).kind).toBe('cancelled')
  })

  it('actividad pasada', () => {
    expect(getRegistrationState(activity({ date: '2026-10-01' }), ctx(3, true))).toEqual({ kind: 'past', wasRegistered: true })
  })

  it('la hora se interpreta en Madrid: 12:00 Madrid son las 10:00 UTC en octubre', () => {
    expect(getRegistrationState(activity({ date: '2026-10-05', time: '12:30' }), ctx()).kind).toBe('open')
    expect(getRegistrationState(activity({ date: '2026-10-05', time: '11:30' }), ctx()).kind).toBe('past')
  })
})
