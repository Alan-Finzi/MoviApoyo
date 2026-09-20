import { describe, expect, it } from 'vitest'

import { addMinutes, formatDate, formatTime, minutesBetween } from './date'

describe('formatTime', () => {
  it('formatea la hora en America/Argentina/Buenos_Aires (UTC-3) sin horario de verano', () => {
    // 2026-01-15T11:30:00Z son las 08:30 en Argentina.
    expect(formatTime('2026-01-15T11:30:00.000Z')).toBe('08:30')
  })
})

describe('formatDate', () => {
  it('formatea la fecha como dd/mm/aaaa', () => {
    expect(formatDate('2026-01-15T11:30:00.000Z')).toBe('15/01/2026')
  })
})

describe('addMinutes', () => {
  it('suma minutos a una fecha ISO', () => {
    expect(addMinutes('2026-01-15T08:00:00.000Z', 15)).toBe('2026-01-15T08:15:00.000Z')
  })
})

describe('minutesBetween', () => {
  it('calcula la diferencia en minutos entre dos fechas ISO', () => {
    expect(minutesBetween('2026-01-15T08:00:00.000Z', '2026-01-15T08:35:00.000Z')).toBe(35)
  })
})
