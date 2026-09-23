import type { Vehicle } from '@/domain/entities/Vehicle'
import { useCases } from '@/app/providers/dependencies'

import { useAsync, type UseAsyncResult } from './useAsync'

export function useVehicle(vehicleId: string): UseAsyncResult<Vehicle> {
  return useAsync(() => useCases.getVehicleById.execute(vehicleId), [vehicleId])
}
