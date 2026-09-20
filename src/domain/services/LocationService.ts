import type { GeoCoordinates } from '@/domain/valueObjects/Address'

export type LocationListener = (location: GeoCoordinates) => void
export type UnsubscribeLocation = () => void

// Abstracción sobre el origen de la ubicación del vehículo (rule 46). La
// implementación inicial (MockLocationService) simula el movimiento; una
// futura implementación podrá usar la Geolocation API o un sistema de
// tracking real del vehículo.
export interface LocationService {
  getCurrentLocation(vehicleId: string): Promise<GeoCoordinates>
  watchLocation(vehicleId: string, listener: LocationListener): UnsubscribeLocation
  stopWatchingLocation(vehicleId: string): void
}
