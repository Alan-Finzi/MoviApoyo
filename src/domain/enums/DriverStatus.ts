export const DriverStatus = {
  AVAILABLE: 'DISPONIBLE',
  ON_TRIP: 'EN_TRASLADO',
  RESTING: 'DESCANSO',
  UNAVAILABLE: 'NO_DISPONIBLE',
} as const

export type DriverStatus = (typeof DriverStatus)[keyof typeof DriverStatus]
