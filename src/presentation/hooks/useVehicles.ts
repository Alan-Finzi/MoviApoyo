import type { Vehicle } from '@/domain/entities/Vehicle'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useVehicles(): UseAsyncResult<Vehicle[]> {
  return useAsync(() => useCases.getVehicles.execute(), [])
}
