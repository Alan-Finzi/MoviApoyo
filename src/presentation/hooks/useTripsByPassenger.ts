import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'

export function useTripsByPassenger(passengerId: string): UseAsyncResult<TripListItemDto[]> {
  const result = useAsync(() => useCases.getTripsByPassenger.execute(passengerId), [passengerId])
  useLiveTripUpdates(result.reload)
  return result
}
