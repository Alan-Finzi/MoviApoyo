export const PassengerSex = {
  FEMALE: 'FEMENINO',
  MALE: 'MASCULINO',
  OTHER: 'OTRO',
} as const

export type PassengerSex = (typeof PassengerSex)[keyof typeof PassengerSex]
