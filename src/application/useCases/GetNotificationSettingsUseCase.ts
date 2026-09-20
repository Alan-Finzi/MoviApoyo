import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'

export class GetNotificationSettingsUseCase {
  constructor(private readonly notificationSettingsRepository: NotificationSettingsRepository) {}

  execute(): Promise<NotificationSettings> {
    return this.notificationSettingsRepository.getSettings()
  }
}
