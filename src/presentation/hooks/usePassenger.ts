import type { Passenger } from '@/domain/entities/Passenger'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function usePassenger(passengerId: string): UseAsyncResult<Passenger> {
  return useAsync(() => useCases.getPassengerById.execute(passengerId), [passengerId])
}
