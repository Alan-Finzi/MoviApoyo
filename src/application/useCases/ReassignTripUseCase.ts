import type { Trip } from '@/domain/entities/Trip'
import { getDriverFullName } from '@/domain/entities/Driver'
import { TripEventType } from '@/domain/entities/TripEvent'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import type { TripMutableFields, TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { isTerminalTripStatus } from '@/domain/services/TripStatusMachine'
import { ValidationError } from '@/shared/errors/AppError'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

export interface ReassignTripInput {
  readonly tripId: string
  readonly newDriverId?: string
  readonly newVehicleId?: string
  readonly reason: string
  readonly changedBy: string
  // Mensajes de CheckAssignmentConflictsUseCase que el coordinador decidió
  // ignorar al reasignar (mismo criterio que RegisterTripUseCase).
  readonly overriddenConflicts?: readonly string[]
}

// Reasignar chofer y/o vehículo de un traslado ya creado (rule pedida: hoy
// no había ningún camino para hacer esto sin tocar código directamente en
// Firestore). Nunca sobrescribe en silencio: cada cambio queda como un
// TripEvent con el valor anterior, el nuevo, quién lo hizo y por qué.
export class ReassignTripUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly driverRepository: DriverRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(input: ReassignTripInput): Promise<Trip> {
    if (!input.newDriverId && !input.newVehicleId) {
      throw new ValidationError('Elegí un chofer nuevo, un vehículo nuevo, o ambos.')
    }
    if (!input.reason.trim()) {
      throw new ValidationError('Ingresá el motivo de la reasignación.')
    }

    const trip = await this.tripRepository.getTripById(input.tripId)
    if (isTerminalTripStatus(trip.status)) {
      throw new ValidationError(
        'No se puede reasignar chofer ni vehículo en un traslado que ya está cerrado.',
      )
    }

    const changes: TripMutableFields = {
      ...(input.newDriverId && input.newDriverId !== trip.driverId
        ? { driverId: input.newDriverId }
        : {}),
      ...(input.newVehicleId && input.newVehicleId !== trip.vehicleId
        ? { vehicleId: input.newVehicleId }
        : {}),
    }
    if (Object.keys(changes).length === 0) {
      throw new ValidationError('El chofer/vehículo elegido ya es el que tiene asignado.')
    }

    let updatedTrip = await this.tripRepository.updateTrip(input.tripId, changes)

    if (changes.driverId) {
      const [previousDriver, newDriver] = await Promise.all([
        this.driverRepository.getDriverById(trip.driverId),
        this.driverRepository.getDriverById(changes.driverId),
      ])
      const previousLabel = getDriverFullName(previousDriver)
      const newLabel = getDriverFullName(newDriver)
      updatedTrip = await this.tripRepository.appendTripEvent(input.tripId, {
        tripId: input.tripId,
        type: TripEventType.DRIVER_REASSIGNED,
        timestamp: new Date().toISOString(),
        description: `Chofer reasignado: ${previousLabel} → ${newLabel}. Motivo: ${input.reason}`,
        actor: input.changedBy,
        previousValue: previousLabel,
        newValue: newLabel,
        reason: input.reason,
      })
    }

    if (changes.vehicleId) {
      const [previousVehicle, newVehicle] = await Promise.all([
        this.vehicleRepository.getVehicleById(trip.vehicleId),
        this.vehicleRepository.getVehicleById(changes.vehicleId),
      ])
      const previousLabel = formatVehiclePlate(previousVehicle.licensePlate)
      const newLabel = formatVehiclePlate(newVehicle.licensePlate)
      updatedTrip = await this.tripRepository.appendTripEvent(input.tripId, {
        tripId: input.tripId,
        type: TripEventType.VEHICLE_REASSIGNED,
        timestamp: new Date().toISOString(),
        description: `Vehículo reasignado: ${previousLabel} → ${newLabel}. Motivo: ${input.reason}`,
        actor: input.changedBy,
        previousValue: previousLabel,
        newValue: newLabel,
        reason: input.reason,
      })
    }

    if (input.overriddenConflicts && input.overriddenConflicts.length > 0) {
      updatedTrip = await this.tripRepository.appendTripEvent(input.tripId, {
        tripId: input.tripId,
        type: TripEventType.ASSIGNMENT_OVERRIDE,
        timestamp: new Date().toISOString(),
        description: `Se reasignó a pesar de: ${input.overriddenConflicts.join(' / ')}`,
        actor: input.changedBy,
      })
    }

    return updatedTrip
  }
}
