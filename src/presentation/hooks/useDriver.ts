import type { Driver } from '@/domain/entities/Driver'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useDriver(driverId: string): UseAsyncResult<Driver> {
  return useAsync(() => useCases.getDriverById.execute(driverId), [driverId])
}
