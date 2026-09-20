import type {
  LocationListener,
  LocationService,
  UnsubscribeLocation,
} from '@/domain/services/LocationService'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import { NotFoundError } from '@/shared/errors/AppError'

// Implementación inicial de LocationService (rule 46): la ubicación "en
// vivo" de un vehículo es la última posición conocida de su traslado
// activo. TripSimulationEngine llama a notifyLocationChanged() cada vez que
// mueve un vehículo, para avisar a quien esté escuchando con
// watchLocation(). El día de mañana, una implementación real leerá la
// Geolocation API o el tracking del vehículo, sin cambiar este contrato.
export class MockLocationService implements LocationService {
  private readonly listenersByVehicle = new Map<string, Set<LocationListener>>()

  constructor(private readonly tripRepository: TripRepository) {}

  async getCurrentLocation(vehicleId: string): Promise<GeoCoordinates> {
    const trips = await this.tripRepository.getTrips()
    const activeTrip = trips.find((trip) => trip.vehicleId === vehicleId && trip.currentLocation)
    if (!activeTrip?.currentLocation) {
      throw new NotFoundError(`No hay una ubicación conocida para el vehículo "${vehicleId}".`)
    }
    return activeTrip.currentLocation
  }

  watchLocation(vehicleId: string, listener: LocationListener): UnsubscribeLocation {
    const listeners = this.listenersByVehicle.get(vehicleId) ?? new Set<LocationListener>()
    listeners.add(listener)
    this.listenersByVehicle.set(vehicleId, listeners)
    return () => listeners.delete(listener)
  }

  stopWatchingLocation(vehicleId: string): void {
    this.listenersByVehicle.delete(vehicleId)
  }

  notifyLocationChanged(vehicleId: string, location: GeoCoordinates): void {
    this.listenersByVehicle.get(vehicleId)?.forEach((listener) => listener(location))
  }
}
