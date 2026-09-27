import { getDriverFullName } from '@/domain/entities/Driver'
import type { Driver } from '@/domain/entities/Driver'
import type { Trip } from '@/domain/entities/Trip'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { AssignmentConflictType } from '@/domain/enums/AssignmentConflictType'
import { DriverStatus } from '@/domain/enums/DriverStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { isTerminalTripStatus } from './TripStatusMachine'

// Margen mínimo entre el fin de un traslado y el comienzo del siguiente
// para el mismo chofer/vehículo. No es una regla dura (rule pedida: "no
// bloquear absolutamente si hay un motivo operativo"), solo el umbral que
// dispara la advertencia de "tiempo insuficiente entre viajes".
const MIN_GAP_MINUTES = 15

export interface AssignmentConflict {
  readonly type: AssignmentConflictType
  readonly message: string
  readonly conflictingTripId?: string
}

export interface AssignmentCandidate {
  readonly driverId: string
  readonly vehicleId: string
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  // El propio traslado, al reasignar uno ya existente: se excluye de la
  // búsqueda de solapamientos para no marcarse conflicto a sí mismo.
  readonly excludeTripId?: string
}

interface AssignmentConflictContext {
  readonly driver: Driver
  readonly vehicle: Vehicle
  readonly trips: readonly Trip[]
}

function rangesTooClose(
  aStart: string,
  aEnd: string,
  bStart: string,
  bEnd: string,
  bufferMinutes: number,
): boolean {
  const bufferMs = bufferMinutes * 60_000
  const aStartMs = new Date(aStart).getTime()
  const aEndMs = new Date(aEnd).getTime()
  const bStartMs = new Date(bStart).getTime()
  const bEndMs = new Date(bEnd).getTime()
  return aStartMs - bufferMs < bEndMs && bStartMs - bufferMs < aEndMs
}

// Pura a propósito (sin repositorios): la use case (CheckAssignmentConflictsUseCase)
// se encarga de buscar chofer/vehículo/traslados, esta función solo decide
// qué cuenta como conflicto — así se puede testear sin mocks de infraestructura.
export function findAssignmentConflicts(
  candidate: AssignmentCandidate,
  context: AssignmentConflictContext,
): readonly AssignmentConflict[] {
  const conflicts: AssignmentConflict[] = []
  const { driver, vehicle, trips } = context

  if (driver.status === DriverStatus.UNAVAILABLE) {
    conflicts.push({
      type: AssignmentConflictType.DRIVER_UNAVAILABLE,
      message: `${getDriverFullName(driver)} está marcado como no disponible.`,
    })
  }

  if (vehicle.status === VehicleStatus.OUT_OF_SERVICE) {
    conflicts.push({
      type: AssignmentConflictType.VEHICLE_OUT_OF_SERVICE,
      message: `El vehículo ${formatVehiclePlate(vehicle.licensePlate)} está fuera de servicio.`,
    })
  }

  for (const trip of trips) {
    if (trip.id === candidate.excludeTripId) continue
    if (isTerminalTripStatus(trip.status)) continue
    if (
      !rangesTooClose(
        candidate.scheduledDeparture,
        candidate.estimatedArrival,
        trip.scheduledDeparture,
        trip.estimatedArrival,
        MIN_GAP_MINUTES,
      )
    ) {
      continue
    }

    if (trip.driverId === candidate.driverId) {
      conflicts.push({
        type: AssignmentConflictType.DRIVER_BUSY,
        message: `${getDriverFullName(driver)} ya tiene otro traslado en un horario cercano.`,
        conflictingTripId: trip.id,
      })
    }
    if (trip.vehicleId === candidate.vehicleId) {
      conflicts.push({
        type: AssignmentConflictType.VEHICLE_BUSY,
        message: `El vehículo ${formatVehiclePlate(vehicle.licensePlate)} ya está asignado a otro traslado en un horario cercano.`,
        conflictingTripId: trip.id,
      })
    }
  }

  return conflicts
}
