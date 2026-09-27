import { describe, expect, it } from 'vitest'

import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import { Weekday } from '@/domain/enums/Weekday'

import { resolveOccurrenceDates } from './RecurringTripScheduler'

describe('resolveOccurrenceDates', () => {
  it('devuelve una fecha por cada día de la semana elegido, dentro del rango', () => {
    const dates = resolveOccurrenceDates(
      {
        recurrence: DestinationRecurrence.WEEKDAYS,
        weekdays: [Weekday.MONDAY, Weekday.WEDNESDAY, Weekday.FRIDAY],
        specificDate: null,
      },
      '2026-03-02',
      '2026-03-15',
    )

    // Dos semanas completas, 3 días elegidos por semana.
    expect(dates).toHaveLength(6)
    for (const date of dates) {
      const jsDay = new Date(`${date}T00:00:00`).getDay()
      expect([1, 3, 5]).toContain(jsDay)
    }
  })

  it('no devuelve nada si no hay ningún día de la semana elegido', () => {
    const dates = resolveOccurrenceDates(
      { recurrence: DestinationRecurrence.WEEKDAYS, weekdays: [], specificDate: null },
      '2026-03-02',
      '2026-03-15',
    )
    expect(dates).toEqual([])
  })

  it('con FECHA_ESPECIFICA devuelve esa única fecha si cae dentro del rango', () => {
    const dates = resolveOccurrenceDates(
      { recurrence: DestinationRecurrence.SPECIFIC_DATE, weekdays: [], specificDate: '2026-03-10' },
      '2026-03-01',
      '2026-03-31',
    )
    expect(dates).toEqual(['2026-03-10'])
  })

  it('con FECHA_ESPECIFICA no devuelve nada si esa fecha está fuera del rango', () => {
    const dates = resolveOccurrenceDates(
      { recurrence: DestinationRecurrence.SPECIFIC_DATE, weekdays: [], specificDate: '2026-04-01' },
      '2026-03-01',
      '2026-03-31',
    )
    expect(dates).toEqual([])
  })

  it('respeta el límite máximo de ocurrencias generadas de una vez', () => {
    const dates = resolveOccurrenceDates(
      { recurrence: DestinationRecurrence.WEEKDAYS, weekdays: [Weekday.MONDAY], specificDate: null },
      '2020-01-01',
      '2030-01-01',
    )
    expect(dates.length).toBeLessThanOrEqual(61)
  })
})
