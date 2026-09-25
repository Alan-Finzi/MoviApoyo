import type { Vehicle } from '@/domain/entities/Vehicle'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { createLicensePlate } from '@/domain/valueObjects/LicensePlate'

export interface RegisterVehicleInput {
  readonly licensePlate: string
  readonly brand: string
  readonly model: string
  readonly year: number
  readonly assignedDriverId?: string | null
  readonly notes?: string
}

// Alta de vehículo desde el panel de admin. Arranca siempre DISPONIBLE, con
// combustible lleno y 0 km recorridos en el sistema — el resto de los
// valores se actualiza a medida que el vehículo hace traslados reales.
export class RegisterVehicleUseCase {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  execute(input: RegisterVehicleInput): Promise<Vehicle> {
    return this.vehicleRepository.registerVehicle({
      licensePlate: createLicensePlate(input.licensePlate),
      brand: input.brand,
      model: input.model,
      year: input.year,
      status: VehicleStatus.AVAILABLE,
      assignedDriverId: input.assignedDriverId ?? null,
      fuelLevelPercentage: 100,
      odometerKm: 0,
      notes: input.notes,
    })
  }
}
