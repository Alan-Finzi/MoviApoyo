export const PassengerStatus = {
  ACTIVE: 'ACTIVO',
  INACTIVE: 'INACTIVO',
} as const

export type PassengerStatus = (typeof PassengerStatus)[keyof typeof PassengerStatus]
