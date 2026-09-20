import type { Vehicle } from '@/domain/entities/Vehicle'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'

export class GetVehiclesUseCase {
  constructor(private readonly vehicleRepository: VehicleRepository) {}

  execute(): Promise<Vehicle[]> {
    return this.vehicleRepository.getVehicles()
  }
}
