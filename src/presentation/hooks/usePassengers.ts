import type { Passenger } from '@/domain/entities/Passenger'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function usePassengers(): UseAsyncResult<Passenger[]> {
  return useAsync(() => useCases.getPassengers.execute(), [])
}
