import { useEffect } from 'react'

import type { AppNotification } from '@/domain/entities/Notification'
import { notificationRepository, useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useNotificationsByTrip(tripId: string): UseAsyncResult<AppNotification[]> {
  const result = useAsync(() => useCases.getNotificationsByTrip.execute(tripId), [tripId])
  useEffect(() => notificationRepository.subscribe(result.reload), [result.reload])
  return result
}
