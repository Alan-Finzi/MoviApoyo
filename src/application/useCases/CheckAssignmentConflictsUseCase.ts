import type { AssignmentConflict } from '@/domain/services/AssignmentConflictChecker'
import { findAssignmentConflicts } from '@/domain/services/AssignmentConflictChecker'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'

export interface CheckAssignmentConflictsInput {
  readonly driverId: string
  readonly vehicleId: string
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  // Se pasa al reasignar un traslado ya existente, para no marcarlo en
  // conflicto contra sí mismo.
  readonly excludeTripId?: string
}

// No bloquea nada por sí sola (rule pedida): solo informa. Quien la llama
// (TripForm, ReassignTripForm) decide si mostrar la advertencia y pedir
// confirmación explícita antes de guardar.
export class CheckAssignmentConflictsUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly driverRepository: DriverRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(input: CheckAssignmentConflictsInput): Promise<readonly AssignmentConflict[]> {
    const [driver, vehicle, trips] = await Promise.all([
      this.driverRepository.getDriverById(input.driverId),
      this.vehicleRepository.getVehicleById(input.vehicleId),
      this.tripRepository.getTrips(),
    ])

    return findAssignmentConflicts(input, { driver, vehicle, trips })
  }
}
