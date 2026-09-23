import type { Vehicle } from '@/domain/entities/Vehicle'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'

export class GetVehicleByIdUseCase {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  execute(vehicleId: string): Promise<Vehicle> {
    return this.vehicleRepository.getVehicleById(vehicleId)
  }
}
