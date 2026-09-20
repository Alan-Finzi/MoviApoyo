import type { Driver } from '@/domain/entities/Driver'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { driversStore } from './stores'

export class MockDriverRepository implements DriverRepository {
  getDrivers(): Promise<Driver[]> {
    return Promise.resolve(driversStore.getState())
  }

  getDriverById(id: string): Promise<Driver> {
    const driver = driversStore.getState().find((item) => item.id === id)
    if (!driver) throw new NotFoundError(`No existe el chofer con id "${id}".`)
    return Promise.resolve(driver)
  }
}
