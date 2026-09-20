import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'

export class GetNotificationsUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(): Promise<AppNotification[]> {
    const notifications = await this.notificationRepository.getNotifications()
    return [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}
