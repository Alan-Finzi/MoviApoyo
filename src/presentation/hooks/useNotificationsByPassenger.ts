import { useEffect } from 'react'

import type { AppNotification } from '@/domain/entities/Notification'
import { notificationRepository, useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useNotificationsByPassenger(
  passengerId: string,
): UseAsyncResult<AppNotification[]> {
  const result = useAsync(
    () => useCases.getNotificationsByPassenger.execute(passengerId),
    [passengerId],
  )
  useEffect(() => notificationRepository.subscribe(result.reload), [result.reload])
  return result
}
