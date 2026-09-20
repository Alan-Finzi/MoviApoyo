import type { Guardian } from '@/domain/entities/Guardian'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useGuardians(): UseAsyncResult<Guardian[]> {
  return useAsync(() => useCases.getGuardians.execute(), [])
}
