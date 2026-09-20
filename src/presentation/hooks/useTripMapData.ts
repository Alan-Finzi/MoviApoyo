import type { MapViewData } from '@/domain/services/MapService'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'
import { useLiveTripUpdates } from './useLiveTripUpdates'

export function useTripMapData(tripId: string): UseAsyncResult<MapViewData> {
  const result = useAsync(() => useCases.getTripMapData.execute(tripId), [tripId])
  useLiveTripUpdates(result.reload)
  return result
}
