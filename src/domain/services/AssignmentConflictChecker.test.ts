import { describe, expect, it } from 'vitest'

import type { Driver } from '@/domain/entities/Driver'
import type { Trip } from '@/domain/entities/Trip'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { AssignmentConflictType } from '@/domain/enums/AssignmentConflictType'
import { DriverStatus } from '@/domain/enums/DriverStatus'
import { TripStatus } from '@/domain/enums/TripStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import { createLicensePlate } from '@/domain/valueObjects/LicensePlate'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'

import { findAssignmentConflicts } from './AssignmentConflictChecker'

function buildDriver(overrides: Partial<Driver> = {}): Driver {
  return {
    id: 'driver-1',
    firstName: 'Carlos',
    lastName: 'Gómez',
    phone: createPhoneNumber('+5493511234567'),
    assignedVehicleId: 'vehicle-1',
    status: DriverStatus.AVAILABLE,
    ...overrides,
  }
}

function buildVehicle(overrides: Partial<Vehicle> = {}): Vehicle {
  return {
    id: 'vehicle-1',
    licensePlate: createLicensePlate('AB123CD'),
    brand: 'Renault',
    model: 'Kangoo',
    year: 2020,
    status: VehicleStatus.AVAILABLE,
    assignedDriverId: 'driver-1',
    fuelLevelPercentage: 80,
    odometerKm: 10000,
    ...overrides,
  }
}

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: '2026-01-01T08:00:00.000Z',
    estimatedArrival: '2026-01-01T08:40:00.000Z',
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

const candidate = {
  driverId: 'driver-1',
  vehicleId: 'vehicle-1',
  scheduledDeparture: '2026-01-01T08:10:00.000Z',
  estimatedArrival: '2026-01-01T08:50:00.000Z',
}

describe('findAssignmentConflicts', () => {
  it('no reporta nada cuando no hay superposición ni problemas de estado', () => {
    const conflicts = findAssignmentConflicts(
      { ...candidate, scheduledDeparture: '2026-01-01T10:00:00.000Z', estimatedArrival: '2026-01-01T10:40:00.000Z' },
      { driver: buildDriver(), vehicle: buildVehicle(), trips: [buildTrip()] },
    )
    expect(conflicts).toEqual([])
  })

  it('detecta chofer y vehículo ocupados cuando los horarios se superponen', () => {
    const conflicts = findAssignmentConflicts(candidate, {
      driver: buildDriver(),
      vehicle: buildVehicle(),
      trips: [buildTrip()],
    })
    expect(conflicts.map((c) => c.type)).toEqual(
      expect.arrayContaining([
        AssignmentConflictType.DRIVER_BUSY,
        AssignmentConflictType.VEHICLE_BUSY,
      ]),
    )
    expect(conflicts.every((c) => c.conflictingTripId === 'trip-1')).toBe(true)
  })

  it('ignora traslados en un estado terminal al buscar superposiciones', () => {
    const conflicts = findAssignmentConflicts(candidate, {
      driver: buildDriver(),
      vehicle: buildVehicle(),
      trips: [buildTrip({ status: TripStatus.CANCELLED })],
    })
    expect(conflicts).toEqual([])
  })

  it('excluye el propio traslado al reasignar (excludeTripId)', () => {
    const conflicts = findAssignmentConflicts(
      { ...candidate, excludeTripId: 'trip-1' },
      { driver: buildDriver(), vehicle: buildVehicle(), trips: [buildTrip()] },
    )
    expect(conflicts).toEqual([])
  })

  it('marca chofer inactivo y vehículo fuera de servicio', () => {
    const conflicts = findAssignmentConflicts(
      { ...candidate, scheduledDeparture: '2026-01-02T08:00:00.000Z', estimatedArrival: '2026-01-02T08:40:00.000Z' },
      {
        driver: buildDriver({ status: DriverStatus.UNAVAILABLE }),
        vehicle: buildVehicle({ status: VehicleStatus.OUT_OF_SERVICE }),
        trips: [],
      },
    )
    expect(conflicts.map((c) => c.type)).toEqual(
      expect.arrayContaining([
        AssignmentConflictType.DRIVER_UNAVAILABLE,
        AssignmentConflictType.VEHICLE_OUT_OF_SERVICE,
      ]),
    )
  })
})
