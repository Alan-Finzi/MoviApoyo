import type { NotificationSettings } from '@/domain/entities/NotificationSettings'

export interface NotificationSettingsRepository {
  getSettings(): Promise<NotificationSettings>
  updateSettings(settings: NotificationSettings): Promise<NotificationSettings>
}
