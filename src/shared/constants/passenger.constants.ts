import { PassengerBloodType } from '@/domain/enums/PassengerBloodType'
import { PassengerSex } from '@/domain/enums/PassengerSex'
import { PassengerStatus } from '@/domain/enums/PassengerStatus'

export const PASSENGER_STATUS_LABELS: Record<PassengerStatus, string> = {
  [PassengerStatus.ACTIVE]: 'Activo',
  [PassengerStatus.INACTIVE]: 'Inactivo',
}

export const PASSENGER_SEX_LABELS: Record<PassengerSex, string> = {
  [PassengerSex.FEMALE]: 'Femenino',
  [PassengerSex.MALE]: 'Masculino',
  [PassengerSex.OTHER]: 'Otro',
}

export const PASSENGER_BLOOD_TYPE_LABELS: Record<PassengerBloodType, string> = {
  [PassengerBloodType.A_POSITIVE]: 'A+',
  [PassengerBloodType.A_NEGATIVE]: 'A-',
  [PassengerBloodType.B_POSITIVE]: 'B+',
  [PassengerBloodType.B_NEGATIVE]: 'B-',
  [PassengerBloodType.AB_POSITIVE]: 'AB+',
  [PassengerBloodType.AB_NEGATIVE]: 'AB-',
  [PassengerBloodType.O_POSITIVE]: 'O+',
  [PassengerBloodType.O_NEGATIVE]: 'O-',
}
