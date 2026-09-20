import type { CheckTripProximityUseCase } from '@/application/useCases/CheckTripProximityUseCase'
import type { UpdateTripStatusUseCase } from '@/application/useCases/UpdateTripStatusUseCase'
import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { DistanceService } from '@/domain/services/DistanceService'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import { DEFAULT_AVERAGE_SPEED_KMH } from '@/shared/constants/app.constants'
import { Logger } from '@/shared/utils/Logger'

import type { MockLocationService } from './MockLocationService'

const TICK_INTERVAL_MS = 4000
const APPROACH_STEP_RATIO = 0.22
const START_OFFSET_DEGREES = 0.012

const NEAR_HOME_THRESHOLD_METERS = 200
const ARRIVING_THRESHOLD_METERS = 60
const ARRIVAL_EPSILON_METERS = 12
const NEAR_DESTINATION_THRESHOLD_METERS = 200

const ACTIVE_STATUSES: readonly TripStatus[] = [
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
]

function lerpCoordinates(from: GeoCoordinates, to: GeoCoordinates, ratio: number): GeoCoordinates {
  return {
    latitude: from.latitude + (to.latitude - from.latitude) * ratio,
    longitude: from.longitude + (to.longitude - from.longitude) * ratio,
  }
}

// Punto de partida simulado cuando todavía no hay una ubicación conocida:
// un poco alejado del domicilio, para que se note el desplazamiento.
function fallbackStartLocation(origin: GeoCoordinates): GeoCoordinates {
  return {
    latitude: origin.latitude + START_OFFSET_DEGREES,
    longitude: origin.longitude + START_OFFSET_DEGREES,
  }
}

// Simula, sin GPS real ni backend, el avance del vehículo hacia el
// domicilio del niño y luego hacia el destino (rule 12 del enunciado y
// rule 46/48). Cada tick acerca la posición al objetivo, dispara el aviso
// de proximidad configurado y hace avanzar el estado del traslado cuando
// corresponde — siempre a través de UpdateTripStatusUseCase, para que quede
// el evento de auditoría y se envíe la notificación asociada (rule 2).
export class TripSimulationEngine {
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor(
    private readonly tripRepository: TripRepository,
    private readonly distanceService: DistanceService,
    private readonly locationService: MockLocationService,
    private readonly checkTripProximityUseCase: CheckTripProximityUseCase,
    private readonly updateTripStatusUseCase: UpdateTripStatusUseCase,
  ) {}

  start(): void {
    if (this.intervalId) return
    this.intervalId = setInterval(() => {
      this.tick().catch((error: unknown) => {
        Logger.error('Error en la simulación de traslados', error)
      })
    }, TICK_INTERVAL_MS)
  }

  stop(): void {
    if (!this.intervalId) return
    clearInterval(this.intervalId)
    this.intervalId = null
  }

  private async tick(): Promise<void> {
    const trips = await this.tripRepository.getTrips()
    const activeTrips = trips.filter((trip) => ACTIVE_STATUSES.includes(trip.status))
    for (const trip of activeTrips) {
      await this.advanceTrip(trip)
    }
  }

  private async advanceTrip(trip: Trip): Promise<void> {
    if (trip.status === TripStatus.PICKED_UP) {
      await this.updateTripStatusUseCase.execute(trip.id, TripStatus.IN_TRANSIT)
      return
    }

    const isApproachingPickup =
      trip.status === TripStatus.ON_THE_WAY ||
      trip.status === TripStatus.NEAR_HOME ||
      trip.status === TripStatus.ARRIVING
    const target = isApproachingPickup ? trip.origin.coordinates : trip.destination.coordinates
    const currentLocation =
      trip.currentLocation ??
      (isApproachingPickup
        ? fallbackStartLocation(trip.origin.coordinates)
        : trip.origin.coordinates)

    const newLocation = lerpCoordinates(currentLocation, target, APPROACH_STEP_RATIO)
    await this.tripRepository.updateTrip(trip.id, { currentLocation: newLocation })
    this.locationService.notifyLocationChanged(trip.vehicleId, newLocation)

    const distance = this.distanceService.calculateDistance(newLocation, target)

    if (isApproachingPickup) {
      const etaMinutes = this.distanceService.estimateArrivalMinutes(
        distance,
        DEFAULT_AVERAGE_SPEED_KMH,
      )
      const freshTrip = await this.tripRepository.getTripById(trip.id)
      await this.checkTripProximityUseCase.execute(freshTrip, distance, etaMinutes)

      const nextStatus = this.resolveApproachStatus(trip.status, distance.meters)
      if (nextStatus) {
        await this.updateTripStatusUseCase.execute(trip.id, nextStatus)
      }
    } else {
      const nextStatus = this.resolveTransitStatus(trip.status, distance.meters)
      if (nextStatus) {
        await this.updateTripStatusUseCase.execute(trip.id, nextStatus)
      }
    }
  }

  private resolveApproachStatus(current: TripStatus, distanceMeters: number): TripStatus | null {
    if (current === TripStatus.ARRIVING && distanceMeters <= ARRIVAL_EPSILON_METERS) {
      return TripStatus.PICKED_UP
    }
    if (current === TripStatus.NEAR_HOME && distanceMeters <= ARRIVING_THRESHOLD_METERS) {
      return TripStatus.ARRIVING
    }
    if (current === TripStatus.ON_THE_WAY && distanceMeters <= NEAR_HOME_THRESHOLD_METERS) {
      return TripStatus.NEAR_HOME
    }
    return null
  }

  private resolveTransitStatus(current: TripStatus, distanceMeters: number): TripStatus | null {
    if (current === TripStatus.NEAR_DESTINATION && distanceMeters <= ARRIVAL_EPSILON_METERS) {
      return TripStatus.COMPLETED
    }
    if (current === TripStatus.IN_TRANSIT && distanceMeters <= NEAR_DESTINATION_THRESHOLD_METERS) {
      return TripStatus.NEAR_DESTINATION
    }
    return null
  }
}
