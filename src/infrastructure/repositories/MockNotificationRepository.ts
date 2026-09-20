import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'

import { notificationsStore } from './stores'

export class MockNotificationRepository implements NotificationRepository {
  getNotifications(): Promise<AppNotification[]> {
    return Promise.resolve(notificationsStore.getState())
  }

  saveNotification(notification: Omit<AppNotification, 'id'>): Promise<AppNotification> {
    const saved: AppNotification = { ...notification, id: `notification-${crypto.randomUUID()}` }
    notificationsStore.setState((notifications) => [...notifications, saved])
    return Promise.resolve(saved)
  }

  subscribe(listener: () => void): () => void {
    return notificationsStore.subscribe(listener)
  }
}
