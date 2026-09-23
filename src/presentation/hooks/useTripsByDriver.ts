import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'

export function useTripsByDriver(driverId: string): UseAsyncResult<TripListItemDto[]> {
  const result = useAsync(() => useCases.getTripsByDriver.execute(driverId), [driverId])
  useLiveTripUpdates(result.reload)
  return result
}
