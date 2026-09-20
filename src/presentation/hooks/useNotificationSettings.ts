import { useCallback } from 'react'

import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export interface UseNotificationSettingsResult extends UseAsyncResult<NotificationSettings> {
  readonly updateSettings: (settings: NotificationSettings) => Promise<NotificationSettings>
}

export function useNotificationSettings(): UseNotificationSettingsResult {
  const result = useAsync(() => useCases.getNotificationSettings.execute(), [])
  const { reload } = result

  const updateSettings = useCallback(
    async (settings: NotificationSettings) => {
      const updated = await useCases.updateNotificationSettings.execute(settings)
      reload()
      return updated
    },
    [reload],
  )

  return { ...result, updateSettings }
}
