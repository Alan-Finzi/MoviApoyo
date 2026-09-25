import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function usePassengerDestinations(
  passengerId: string,
): UseAsyncResult<PassengerDestination[]> {
  return useAsync(() => useCases.getPassengerDestinations.execute(passengerId), [passengerId])
}
