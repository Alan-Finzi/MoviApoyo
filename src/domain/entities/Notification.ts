import type { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { NotificationStatus } from '@/domain/enums/NotificationStatus'
import type { NotificationType } from '@/domain/enums/NotificationType'

// Se llama "AppNotification" (no "Notification") para no chocar con el tipo
// global Notification del navegador (Web Notifications API).
export interface AppNotification {
  readonly id: string
  readonly tripId: string
  readonly guardianId: string
  readonly type: NotificationType
  readonly channel: NotificationChannel
  readonly message: string
  readonly status: NotificationStatus
  readonly createdAt: string
}
