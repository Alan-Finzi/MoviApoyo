import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'

import { notificationSettingsStore } from './stores'

export class MockNotificationSettingsRepository implements NotificationSettingsRepository {
  getSettings(): Promise<NotificationSettings> {
    return Promise.resolve(notificationSettingsStore.getState())
  }

  updateSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    notificationSettingsStore.setState(() => settings)
    return Promise.resolve(settings)
  }
}
