import { describe, expect, it } from 'vitest'

import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { TripRepository } from '@/domain/repositories/TripRepository'

import { GetScheduleRecommendationUseCase } from './GetScheduleRecommendationUseCase'

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-x',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: '2026-01-01T08:00:00.000Z',
    estimatedArrival: '2026-01-01T08:30:00.000Z',
    status: TripStatus.COMPLETED,
    delayMinutes: 0,
    currentLocation: null,
    events: [],
    notifiedMilestones: [],
    actualDepartureAt: '2026-01-01T08:00:00.000Z',
    actualArrivalAt: '2026-01-01T08:30:00.000Z',
    ...overrides,
  }
}

function buildRepository(trips: readonly Trip[]): TripRepository {
  return {
    getTrips: () => Promise.resolve([...trips]),
    getTripById: () => Promise.reject(new Error('no usado en este test')),
    updateTrip: () => Promise.reject(new Error('no usado en este test')),
    appendTripEvent: () => Promise.reject(new Error('no usado en este test')),
    markMilestoneNotified: () => Promise.reject(new Error('no usado en este test')),
    subscribe: () => () => undefined,
  }
}

describe('GetScheduleRecommendationUseCase', () => {
  it('avisa que faltan datos si hay menos de 3 viajes finalizados', async () => {
    const useCase = new GetScheduleRecommendationUseCase(buildRepository([buildTrip()]))

    const result = await useCase.execute('passenger-1')

    expect(result.sampleSize).toBe(1)
    expect(result.averageDepartureDeltaMinutes).toBeNull()
    expect(result.recommendationMessage).toMatch(/no hay suficientes/i)
  })

  it('sugiere ajustar el horario cuando el chofer sale tarde de forma consistente', async () => {
    const lateTrips = [
      buildTrip({ id: 't1', actualDepartureAt: '2026-01-01T08:10:00.000Z' }),
      buildTrip({ id: 't2', actualDepartureAt: '2026-01-01T08:10:00.000Z' }),
      buildTrip({ id: 't3', actualDepartureAt: '2026-01-01T08:10:00.000Z' }),
    ]
    const useCase = new GetScheduleRecommendationUseCase(buildRepository(lateTrips))

    const result = await useCase.execute('passenger-1')

    expect(result.sampleSize).toBe(3)
    expect(result.averageDepartureDeltaMinutes).toBe(10)
    expect(result.recommendationMessage).toMatch(/más tarde/i)
  })

  it('ignora viajes de otros pacientes y los que no están finalizados', async () => {
    const trips = [
      buildTrip({ id: 't1', passengerId: 'passenger-2' }),
      buildTrip({
        id: 't2',
        status: TripStatus.SCHEDULED,
        actualDepartureAt: null,
        actualArrivalAt: null,
      }),
    ]
    const useCase = new GetScheduleRecommendationUseCase(buildRepository(trips))

    const result = await useCase.execute('passenger-1')

    expect(result.sampleSize).toBe(0)
  })
})
