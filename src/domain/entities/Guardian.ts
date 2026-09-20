import type { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { PhoneNumber } from '@/domain/valueObjects/PhoneNumber'

// Padre/tutor del niño. Rule 13: se modela por separado del pasajero porque
// es quien recibe las notificaciones, no quien viaja.
export interface Guardian {
  readonly id: string
  readonly fullName: string
  readonly phone: PhoneNumber
  readonly relationship: string
  readonly notificationChannels: readonly NotificationChannel[]
}
