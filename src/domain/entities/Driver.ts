import type { DriverStatus } from '@/domain/enums/DriverStatus'
import type { PhoneNumber } from '@/domain/valueObjects/PhoneNumber'

export interface Driver {
  readonly id: string
  readonly firstName: string
  readonly lastName: string
  readonly phone: PhoneNumber
  readonly assignedVehicleId: string | null
  readonly status: DriverStatus
  readonly photoUrl?: string
}

export function getDriverFullName(driver: Driver): string {
  return `${driver.firstName} ${driver.lastName}`
}
