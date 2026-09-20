import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'

export function useTrips(): UseAsyncResult<TripListItemDto[]> {
  const result = useAsync(() => useCases.getTrips.execute(), [])
  useLiveTripUpdates(result.reload)
  return result
}
