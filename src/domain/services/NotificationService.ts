import type { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { NotificationType } from '@/domain/enums/NotificationType'

export interface SendNotificationInput {
  readonly tripId: string
  readonly guardianId: string
  readonly type: NotificationType
  readonly channel: NotificationChannel
  readonly message: string
}

// Contrato desacoplado de la UI y del proveedor real. Hoy la única
// implementación es MockNotificationService; el día de mañana,
// WhatsAppNotificationService la reemplaza sin tocar Application ni
// Presentation (rule 3).
export interface NotificationService {
  sendNotification(input: SendNotificationInput): Promise<void>
}
