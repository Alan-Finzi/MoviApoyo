import type { Driver } from '@/domain/entities/Driver'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'

export class GetDriversUseCase {
  constructor(private readonly driverRepository: DriverRepository) {}

  execute(): Promise<Driver[]> {
    return this.driverRepository.getDrivers()
  }
}
