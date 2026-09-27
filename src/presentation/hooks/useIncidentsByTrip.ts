import type { Incident } from '@/domain/entities/Incident'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useIncidentsByTrip(tripId: string): UseAsyncResult<Incident[]> {
  return useAsync(() => useCases.getIncidentsByTrip.execute(tripId), [tripId])
}
