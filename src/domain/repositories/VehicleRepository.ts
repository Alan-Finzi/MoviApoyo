import type { Vehicle } from '@/domain/entities/Vehicle'

export interface VehicleRepository {
  getVehicles(): Promise<Vehicle[]>
  getVehicleById(id: string): Promise<Vehicle>
}
