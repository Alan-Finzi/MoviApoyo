import type { AppNotification } from '@/domain/entities/Notification'

export interface NotificationRepository {
  getNotifications(): Promise<AppNotification[]>
  saveNotification(notification: Omit<AppNotification, 'id'>): Promise<AppNotification>
  subscribe(listener: () => void): () => void
}
