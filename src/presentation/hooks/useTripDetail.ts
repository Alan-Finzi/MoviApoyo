import type { TripDetailDto } from '@/application/dto/TripDetailDto'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'

export function useTripDetail(tripId: string): UseAsyncResult<TripDetailDto> {
  const result = useAsync(() => useCases.getTripById.execute(tripId), [tripId])
  useLiveTripUpdates(result.reload)
  return result
}
