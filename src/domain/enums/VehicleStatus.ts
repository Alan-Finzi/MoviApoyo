export const VehicleStatus = {
  AVAILABLE: 'DISPONIBLE',
  IN_SERVICE: 'EN_SERVICIO',
  IN_MAINTENANCE: 'EN_MANTENIMIENTO',
  OUT_OF_SERVICE: 'FUERA_DE_SERVICIO',
} as const

export type VehicleStatus = (typeof VehicleStatus)[keyof typeof VehicleStatus]
