import { describe, expect, it } from 'vitest'

import type { Incident } from '@/domain/entities/Incident'
import type { Trip } from '@/domain/entities/Trip'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { IncidentType } from '@/domain/enums/IncidentType'
import { TripStatus } from '@/domain/enums/TripStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { createLicensePlate } from '@/domain/valueObjects/LicensePlate'

import { GetDashboardSummaryUseCase } from './GetDashboardSummaryUseCase'

const TODAY = new Date().toISOString()
const YESTERDAY = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: `trip-${Math.random().toString(36).slice(2)}`,
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: TODAY,
    estimatedArrival: TODAY,
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

function buildIncident(overrides: Partial<Incident> = {}): Incident {
  return {
    id: `incident-${Math.random().toString(36).slice(2)}`,
    tripId: 'trip-1',
    type: IncidentType.OTHER,
    description: 'Test',
    timestamp: TODAY,
    estimatedDelayMinutes: 10,
    reportedBy: 'Sistema',
    ...overrides,
  }
}

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: `vehicle-${Math.random().toString(36).slice(2)}`,
    licensePlate: createLicensePlate('ABC123'),
    brand: 'Renault',
    model: 'Kangoo',
    year: 2020,
    status: VehicleStatus.AVAILABLE,
    assignedDriverId: null,
    fuelLevelPercentage: 80,
    odometerKm: 1000,
    ...overrides,
  }
}

describe('GetDashboardSummaryUseCase', () => {
  it('cuenta cada estado de hoy en su propio balde, ignorando los de otros días', async () => {
    const trips = [
      buildTrip({ status: TripStatus.SCHEDULED }),
      buildTrip({ status: TripStatus.CONFIRMATION_PENDING }),
      buildTrip({ status: TripStatus.DRIVER_ACCEPTED }),
      buildTrip({ status: TripStatus.ON_THE_WAY }),
      buildTrip({ status: TripStatus.ARRIVED_AT_DESTINATION }),
      buildTrip({ status: TripStatus.COMPLETED }),
      buildTrip({ status: TripStatus.DELAYED }),
      buildTrip({ status: TripStatus.CANCELLED }),
      buildTrip({ status: TripStatus.NOT_COMPLETED }),
      buildTrip({ status: TripStatus.NO_SHOW }),
      buildTrip({ status: TripStatus.INCIDENT }),
      // Mismo estado, pero de ayer — no debería contarse en ningún balde de hoy.
      buildTrip({ status: TripStatus.COMPLETED, scheduledDeparture: YESTERDAY }),
    ]
    const tripRepository: TripRepository = {
      getTrips: () => Promise.resolve(trips),
      getTripById: () => Promise.reject(new Error('no usado en este test')),
      registerTrip: () => Promise.reject(new Error('no usado en este test')),
      updateTrip: () => Promise.reject(new Error('no usado en este test')),
      appendTripEvent: () => Promise.reject(new Error('no usado en este test')),
      markMilestoneNotified: () => Promise.reject(new Error('no usado en este test')),
      subscribe: () => () => undefined,
    }
    const vehicleRepository: VehicleRepository = {
      getVehicles: () =>
        Promise.resolve([
          buildVehicle({ status: VehicleStatus.AVAILABLE }),
          buildVehicle({ status: VehicleStatus.IN_MAINTENANCE }),
          buildVehicle({ status: VehicleStatus.OUT_OF_SERVICE }),
        ]),
      getVehicleById: () => Promise.reject(new Error('no usado en este test')),
      registerVehicle: () => Promise.reject(new Error('no usado en este test')),
    }
    const incidentRepository: IncidentRepository = {
      getIncidents: () =>
        Promise.resolve([
          buildIncident({ type: IncidentType.EMERGENCY, timestamp: TODAY }),
          buildIncident({ type: IncidentType.EMERGENCY, timestamp: YESTERDAY }),
          buildIncident({ type: IncidentType.TRAFFIC, timestamp: TODAY }),
        ]),
      registerIncident: () => Promise.reject(new Error('no usado en este test')),
    }

    const useCase = new GetDashboardSummaryUseCase(
      tripRepository,
      vehicleRepository,
      incidentRepository,
    )
    const summary = await useCase.execute()

    expect(summary.tripsToday).toBe(11)
    expect(summary.tripsUpcoming).toBe(3) // SCHEDULED + CONFIRMATION_PENDING + DRIVER_ACCEPTED
    expect(summary.tripsInProgress).toBe(2) // ON_THE_WAY + ARRIVED_AT_DESTINATION
    expect(summary.tripsCompleted).toBe(1)
    expect(summary.tripsDelayed).toBe(1)
    expect(summary.tripsCancelled).toBe(1)
    expect(summary.tripsNotCompleted).toBe(2) // NOT_COMPLETED + NO_SHOW
    expect(summary.activeIncidents).toBe(1)
    expect(summary.emergencies).toBe(1) // solo la de hoy
    expect(summary.vehiclesAvailable).toBe(1)
    expect(summary.vehiclesWithIssues).toBe(2)
  })
})
