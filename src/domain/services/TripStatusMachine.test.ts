import { describe, expect, it } from 'vitest'

import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import {
  canTransitionTripStatus,
  isTerminalTripStatus,
  resolveHappyPathStatus,
} from './TripStatusMachine'

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
  it('permite pasar de PROGRAMADO a CONFIRMACION_PENDIENTE', () => {
    expect(canTransitionTripStatus(TripStatus.SCHEDULED, TripStatus.CONFIRMATION_PENDING)).toBe(
      true,
    )
  })

  it('no permite saltar de PROGRAMADO directo a EN_CAMINO_AL_DOMICILIO', () => {
    expect(canTransitionTripStatus(TripStatus.SCHEDULED, TripStatus.ON_THE_WAY)).toBe(false)
  })

  it('permite avanzar CONFIRMADO -> CHOFER_ACEPTO -> EN_CAMINO_AL_DOMICILIO', () => {
    expect(canTransitionTripStatus(TripStatus.CONFIRMED, TripStatus.DRIVER_ACCEPTED)).toBe(true)
    expect(canTransitionTripStatus(TripStatus.DRIVER_ACCEPTED, TripStatus.ON_THE_WAY)).toBe(true)
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

  it('separa la llegada al destino de la finalización (regresión: antes saltaba directo)', () => {
    expect(canTransitionTripStatus(TripStatus.NEAR_DESTINATION, TripStatus.COMPLETED)).toBe(false)
    expect(
      canTransitionTripStatus(TripStatus.NEAR_DESTINATION, TripStatus.ARRIVED_AT_DESTINATION),
    ).toBe(true)
    expect(canTransitionTripStatus(TripStatus.ARRIVED_AT_DESTINATION, TripStatus.COMPLETED)).toBe(
      true,
    )
  })
})

describe('isTerminalTripStatus', () => {
  it('marca como terminales los estados sin transiciones salientes', () => {
    expect(isTerminalTripStatus(TripStatus.COMPLETED)).toBe(true)
    expect(isTerminalTripStatus(TripStatus.CANCELLED)).toBe(true)
    expect(isTerminalTripStatus(TripStatus.NO_SHOW)).toBe(true)
    expect(isTerminalTripStatus(TripStatus.RESCHEDULED)).toBe(true)
    expect(isTerminalTripStatus(TripStatus.NOT_COMPLETED)).toBe(true)
  })

  it('no marca como terminales los estados que todavía pueden avanzar', () => {
    expect(isTerminalTripStatus(TripStatus.SCHEDULED)).toBe(false)
    expect(isTerminalTripStatus(TripStatus.IN_TRANSIT)).toBe(false)
    expect(isTerminalTripStatus(TripStatus.INCIDENT)).toBe(false)
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
