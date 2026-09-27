import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import { WEEKDAY_ORDER } from '@/domain/enums/Weekday'

// Límite defensivo: generar de a lotes chicos (ej. "el próximo mes") en vez
// de que un rango de fechas cargado de más genere cientos de traslados sin
// querer.
export const MAX_RECURRING_OCCURRENCES = 60

function toIsoDate(date: Date): string {
  const year = date.getFullYear().toString().padStart(4, '0')
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Devuelve, dentro de [startDate, endDate] (ambos "yyyy-mm-dd", inclusive),
// todas las fechas en las que corresponde generar un traslado para este
// destino — sin tocar ningún repositorio (rule del proyecto: la lógica de
// negocio pura vive en Domain, ver AssignmentConflictChecker/
// TripStatusMachine). GenerateRecurringTripsUseCase es quien la usa para
// crear los traslados en sí.
export function resolveOccurrenceDates(
  destination: Pick<PassengerDestination, 'recurrence' | 'weekdays' | 'specificDate'>,
  startDate: string,
  endDate: string,
): readonly string[] {
  if (destination.recurrence === DestinationRecurrence.SPECIFIC_DATE) {
    if (!destination.specificDate) return []
    const isWithinRange = destination.specificDate >= startDate && destination.specificDate <= endDate
    return isWithinRange ? [destination.specificDate] : []
  }

  if (destination.weekdays.length === 0) return []

  const dates: string[] = []
  const cursor = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  while (cursor <= end && dates.length <= MAX_RECURRING_OCCURRENCES) {
    // Date.getDay() empieza en domingo (0); WEEKDAY_ORDER empieza en lunes.
    const weekday = WEEKDAY_ORDER[(cursor.getDay() + 6) % 7]
    if (weekday && destination.weekdays.includes(weekday)) {
      dates.push(toIsoDate(cursor))
    }
    cursor.setDate(cursor.getDate() + 1)
  }

  return dates
}
