export const AssignmentConflictType = {
  DRIVER_BUSY: 'CHOFER_OCUPADO',
  VEHICLE_BUSY: 'VEHICULO_OCUPADO',
  DRIVER_UNAVAILABLE: 'CHOFER_INACTIVO',
  VEHICLE_OUT_OF_SERVICE: 'VEHICULO_FUERA_DE_SERVICIO',
} as const

export type AssignmentConflictType =
  (typeof AssignmentConflictType)[keyof typeof AssignmentConflictType]
