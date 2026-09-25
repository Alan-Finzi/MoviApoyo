import { useCases } from '@/app/providers/dependencies'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import { NotFoundError } from '@/shared/errors/AppError'

import { useAsync, type UseAsyncResult } from './useAsync'

// GetVehicleLocationUseCase tira NotFoundError cuando el vehículo no tiene
// ningún traslado activo con GPS — no es un error real, es el caso normal
// de "no hay nada que mostrar todavía". Se traduce a 'empty' (en vez de
// dejar que useAsync lo reporte como 'error') para que la pantalla lo trate
// como un estado informativo, no como algo roto con botón de reintentar.
export function useVehicleLocation(vehicleId: string): UseAsyncResult<GeoCoordinates | null> {
  return useAsync(async () => {
    try {
      return await useCases.getVehicleLocation.execute(vehicleId)
    } catch (error) {
      if (error instanceof NotFoundError) return null
      throw error
    }
  }, [vehicleId])
}
