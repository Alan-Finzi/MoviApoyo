import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import { minutesBetween } from '@/shared/utils/date'

import type { ScheduleRecommendationDto } from '../dto/ScheduleRecommendationDto'

// Con menos viajes que esto, cualquier promedio es ruido, no un patrón.
const MIN_SAMPLE_SIZE = 3
// Redondea la sugerencia a pasos de 5 minutos: es la granularidad con la
// que un coordinador realmente puede ajustar un horario de salida.
const ROUNDING_STEP_MINUTES = 5

type CompletedTripWithActuals = Trip & { actualDepartureAt: string; actualArrivalAt: string }

function hasActualTimes(trip: Trip): trip is CompletedTripWithActuals {
  return (
    trip.status === TripStatus.COMPLETED &&
    trip.actualDepartureAt !== null &&
    trip.actualArrivalAt !== null
  )
}

function average(values: readonly number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function roundToStep(value: number, step: number): number {
  return Math.round(value / step) * step
}

function buildRecommendationMessage(averageDepartureDeltaMinutes: number): string {
  const roundedMinutes = Math.abs(roundToStep(averageDepartureDeltaMinutes, ROUNDING_STEP_MINUTES))
  if (roundedMinutes === 0) {
    return 'El chofer sale, en promedio, a horario. No hace falta ajustar nada.'
  }
  const direction = averageDepartureDeltaMinutes > 0 ? 'más tarde' : 'antes'
  return `En los últimos viajes, el chofer salió en promedio ${roundedMinutes.toString()} minutos ${direction} de lo programado. Considerá ajustar el horario de salida.`
}

// Responde exactamente al pedido de negocio: "sacar información de horarios
// para salir 5 min antes o después", a partir de los horarios reales
// (actualDepartureAt/actualArrivalAt) registrados en cada viaje finalizado.
export class GetScheduleRecommendationUseCase {
  constructor(private readonly tripRepository: TripRepository) {}

  async execute(passengerId: string): Promise<ScheduleRecommendationDto> {
    const trips = await this.tripRepository.getTrips()
    const completedTrips = trips
      .filter((trip) => trip.passengerId === passengerId)
      .filter(hasActualTimes)

    if (completedTrips.length < MIN_SAMPLE_SIZE) {
      return {
        sampleSize: completedTrips.length,
        averageDepartureDeltaMinutes: null,
        averageArrivalDeltaMinutes: null,
        recommendationMessage: `Todavía no hay suficientes viajes finalizados (mínimo ${MIN_SAMPLE_SIZE.toString()}) para sugerir un ajuste de horario.`,
      }
    }

    const averageDepartureDeltaMinutes = average(
      completedTrips.map((trip) => minutesBetween(trip.scheduledDeparture, trip.actualDepartureAt)),
    )
    const averageArrivalDeltaMinutes = average(
      completedTrips.map((trip) => minutesBetween(trip.estimatedArrival, trip.actualArrivalAt)),
    )

    return {
      sampleSize: completedTrips.length,
      averageDepartureDeltaMinutes,
      averageArrivalDeltaMinutes,
      recommendationMessage: buildRecommendationMessage(averageDepartureDeltaMinutes),
    }
  }
}
