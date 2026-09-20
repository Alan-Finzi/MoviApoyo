import type { Vehicle } from '@/domain/entities/Vehicle'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { vehiclesStore } from './stores'

export class MockVehicleRepository implements VehicleRepository {
  getVehicles(): Promise<Vehicle[]> {
    return Promise.resolve(vehiclesStore.getState())
  }

  getVehicleById(id: string): Promise<Vehicle> {
    const vehicle = vehiclesStore.getState().find((item) => item.id === id)
    if (!vehicle) throw new NotFoundError(`No existe el vehículo con id "${id}".`)
    return Promise.resolve(vehicle)
  }
}
