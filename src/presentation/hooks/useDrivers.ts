import type { Driver } from '@/domain/entities/Driver'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useDrivers(): UseAsyncResult<Driver[]> {
  return useAsync(() => useCases.getDrivers.execute(), [])
}
