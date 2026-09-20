import type { Incident } from '@/domain/entities/Incident'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useIncidents(): UseAsyncResult<Incident[]> {
  return useAsync(() => useCases.getIncidents.execute(), [])
}
