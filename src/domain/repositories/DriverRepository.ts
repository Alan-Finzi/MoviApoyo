import type { Driver } from '@/domain/entities/Driver'

export interface DriverRepository {
  getDrivers(): Promise<Driver[]>
  getDriverById(id: string): Promise<Driver>
}
