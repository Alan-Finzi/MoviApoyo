import { describe, expect, it } from 'vitest'

import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import { canTransitionTripStatus, resolveHappyPathStatus } from './TripStatusMachine'

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: new Date().toISOString(),
    estimatedArrival: new Date().toISOString(),
    status: TripStatus.SCHEDULED,
    delayMinutes: 0,
    currentLocation: null,
    events: [],
    notifiedMilestones: [],
    actualDepartureAt: null,
    actualArrivalAt: null,
    ...overrides,
  }
}

describe('canTransitionTripStatus', () => {
  it('permite pasar de PROGRAMADO a EN_CAMINO_AL_DOMICILIO', () => {
    expect(canTransitionTripStatus(TripStatus.SCHEDULED, TripStatus.ON_THE_WAY)).toBe(true)
  })

  it('no permite saltar de PROGRAMADO a FINALIZADO', () => {
    expect(canTransitionTripStatus(TripStatus.SCHEDULED, TripStatus.COMPLETED)).toBe(false)
  })

  it('permite retomar el recorrido desde un estado de DEMORADO', () => {
    expect(canTransitionTripStatus(TripStatus.DELAYED, TripStatus.IN_TRANSIT)).toBe(true)
  })

  it('no permite salir de FINALIZADO', () => {
    expect(canTransitionTripStatus(TripStatus.COMPLETED, TripStatus.ON_THE_WAY)).toBe(false)
  })
})

describe('resolveHappyPathStatus', () => {
  it('devuelve el mismo estado si ya está dentro del camino feliz', () => {
    const trip = buildTrip({ status: TripStatus.IN_TRANSIT })
    expect(resolveHappyPathStatus(trip)).toBe(TripStatus.IN_TRANSIT)
  })

  it('reconstruye el último paso conocido si el traslado está DEMORADO', () => {
    const trip = buildTrip({
      status: TripStatus.DELAYED,
      events: [
        {
          id: 'e1',
          tripId: 'trip-1',
          type: 'PROGRAMADO',
          timestamp: new Date().toISOString(),
          description: 'Traslado programado.',
          actor: 'Sistema',
        },
        {
          id: 'e2',
          tripId: 'trip-1',
          type: 'CHOFER_INICIO_RECORRIDO',
          timestamp: new Date().toISOString(),
          description: 'Chofer en camino.',
          actor: 'Sistema',
        },
      ],
    })
    expect(resolveHappyPathStatus(trip)).toBe(TripStatus.ON_THE_WAY)
  })

  it('devuelve PROGRAMADO si no hay ningún evento previo', () => {
    const trip = buildTrip({ status: TripStatus.INCIDENT, events: [] })
    expect(resolveHappyPathStatus(trip)).toBe(TripStatus.SCHEDULED)
  })
})
