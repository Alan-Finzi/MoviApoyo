import { useEffect } from 'react'

import type { AppNotification } from '@/domain/entities/Notification'
import { notificationRepository, useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useNotifications(): UseAsyncResult<AppNotification[]> {
  const result = useAsync(() => useCases.getNotifications.execute(), [])
  useEffect(() => notificationRepository.subscribe(result.reload), [result.reload])
  return result
}
