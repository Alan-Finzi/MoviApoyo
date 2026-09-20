import { DriverStatus } from '@/domain/enums/DriverStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'

import type { StatusTone } from './trip.constants'

export const VEHICLE_STATUS_LABELS: Record<VehicleStatus, string> = {
  [VehicleStatus.AVAILABLE]: 'Disponible',
  [VehicleStatus.IN_SERVICE]: 'En servicio',
  [VehicleStatus.IN_MAINTENANCE]: 'En mantenimiento',
  [VehicleStatus.OUT_OF_SERVICE]: 'Fuera de servicio',
}

export const VEHICLE_STATUS_TONE: Record<VehicleStatus, StatusTone> = {
  [VehicleStatus.AVAILABLE]: 'success',
  [VehicleStatus.IN_SERVICE]: 'info',
  [VehicleStatus.IN_MAINTENANCE]: 'warning',
  [VehicleStatus.OUT_OF_SERVICE]: 'danger',
}

export const DRIVER_STATUS_LABELS: Record<DriverStatus, string> = {
  [DriverStatus.AVAILABLE]: 'Disponible',
  [DriverStatus.ON_TRIP]: 'En traslado',
  [DriverStatus.RESTING]: 'Descanso',
  [DriverStatus.UNAVAILABLE]: 'No disponible',
}

export const DRIVER_STATUS_TONE: Record<DriverStatus, StatusTone> = {
  [DriverStatus.AVAILABLE]: 'success',
  [DriverStatus.ON_TRIP]: 'info',
  [DriverStatus.RESTING]: 'neutral',
  [DriverStatus.UNAVAILABLE]: 'danger',
}

export const LOW_FUEL_THRESHOLD_PERCENTAGE = 20
