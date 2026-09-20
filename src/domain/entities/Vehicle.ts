import type { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { LicensePlate } from '@/domain/valueObjects/LicensePlate'

export interface Vehicle {
  readonly id: string
  readonly licensePlate: LicensePlate
  readonly brand: string
  readonly model: string
  readonly year: number
  readonly status: VehicleStatus
  readonly assignedDriverId: string | null
  readonly fuelLevelPercentage: number
  readonly odometerKm: number
  readonly notes?: string
}
