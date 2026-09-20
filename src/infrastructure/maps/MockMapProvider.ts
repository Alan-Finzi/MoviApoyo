import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { DistanceService } from '@/domain/services/DistanceService'
import type { MapService, MapViewData } from '@/domain/services/MapService'
import { resolveHappyPathStatus } from '@/domain/services/TripStatusMachine'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import { DEFAULT_AVERAGE_SPEED_KMH } from '@/shared/constants/app.constants'

const APPROACHING_STATUSES: readonly TripStatus[] = [
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
]
const IN_TRANSIT_STATUSES: readonly TripStatus[] = [
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
]

// Proveedor de mapa inicial (rule 4): no dibuja un mapa geográfico real,
// solo expone los puntos y la distancia/ETA que <MapContainer> necesita.
// LeafletMapProvider o GoogleMapProvider implementarán este mismo contrato
// más adelante, sin tocar ninguna pantalla.
export class MockMapProvider implements MapService {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly distanceService: DistanceService,
  ) {}

  async getMapViewData(tripId: string): Promise<MapViewData> {
    const trip = await this.tripRepository.getTripById(tripId)
    const nextPoint = this.resolveNextPoint(trip)
    const distance =
      trip.currentLocation && nextPoint
        ? this.distanceService.calculateDistance(trip.currentLocation, nextPoint)
        : null

    return {
      origin: trip.origin.coordinates,
      destination: trip.destination.coordinates,
      vehicleLocation: trip.currentLocation,
      routePoints: [trip.origin.coordinates, trip.destination.coordinates],
      distanceToNextPointMeters: distance ? distance.meters : null,
      estimatedArrivalMinutes: distance
        ? this.distanceService.estimateArrivalMinutes(distance, DEFAULT_AVERAGE_SPEED_KMH)
        : null,
    }
  }

  // Usa resolveHappyPathStatus para seguir mostrando distancia/ETA incluso
  // en un estado excepcional (DEMORADO/INCIDENTE), en vez de dejarlos en
  // blanco solo porque el estado "de superficie" no es uno de tránsito.
  private resolveNextPoint(trip: Trip): GeoCoordinates | null {
    const effectiveStatus = resolveHappyPathStatus(trip)
    if (APPROACHING_STATUSES.includes(effectiveStatus)) return trip.origin.coordinates
    if (IN_TRANSIT_STATUSES.includes(effectiveStatus)) return trip.destination.coordinates
    return null
  }
}
