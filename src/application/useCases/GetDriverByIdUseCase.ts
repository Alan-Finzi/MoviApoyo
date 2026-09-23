import type { Driver } from '@/domain/entities/Driver'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'

export class GetDriverByIdUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  execute(driverId: string): Promise<Driver> {
    return this.driverRepository.getDriverById(driverId)
  }
}
