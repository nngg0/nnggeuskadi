import { describe, expect, it } from 'vitest'
import { addDays, daysInMonth, formatDayMonth, isIsoDate, madridDate, madridToInstant, shiftMonth, weekRange } from '@/lib/domain/dates'

describe('fechas en Madrid', () => {
  it('convierte hora local a UTC en verano e invierno', () => {
    expect(madridToInstant('2026-07-01', '18:00').toISOString()).toBe('2026-07-01T16:00:00.000Z')
    expect(madridToInstant('2026-12-01', '18:00').toISOString()).toBe('2026-12-01T17:00:00.000Z')
  })

  it('obtiene la fecha local de Madrid', () => {
    expect(madridDate(new Date('2026-10-04T22:30:00Z'))).toBe('2026-10-05')
  })

  it('aritmética de calendario', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(weekRange('2026-10-08')).toEqual({ start: '2026-10-05', end: '2026-10-11' })
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(daysInMonth('2028-02')).toBe(29)
  })

  it('valida fechas reales', () => {
    expect(isIsoDate('2026-02-30')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
  })

  it('formatea en español', () => {
    expect(formatDayMonth('2026-10-17')).toBe('17 de octubre')
  })
})
