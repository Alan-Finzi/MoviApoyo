import { IncidentType } from '@/domain/enums/IncidentType'
import { TripStatus } from '@/domain/enums/TripStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import {
  TRIP_AWAITING_DEPARTURE_STATUSES,
  TRIP_IN_PROGRESS_STATUSES,
} from '@/shared/constants/trip.constants'
import { formatDate } from '@/shared/utils/date'

import type { DashboardSummaryDto } from '../dto/DashboardSummaryDto'

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly incidentRepository: IncidentRepository,
  ) {}

  async execute(): Promise<DashboardSummaryDto> {
    const [trips, vehicles, incidents] = await Promise.all([
      this.tripRepository.getTrips(),
      this.vehicleRepository.getVehicles(),
      this.incidentRepository.getIncidents(),
    ])

    const today = formatDate(new Date().toISOString())
    const tripsToday = trips.filter((trip) => formatDate(trip.scheduledDeparture) === today)
    const incidentsToday = incidents.filter((incident) => formatDate(incident.timestamp) === today)

    return {
      tripsToday: tripsToday.length,
      tripsUpcoming: tripsToday.filter(
        (trip) =>
          trip.status === TripStatus.SCHEDULED || TRIP_AWAITING_DEPARTURE_STATUSES.has(trip.status),
      ).length,
      tripsInProgress: tripsToday.filter((trip) => TRIP_IN_PROGRESS_STATUSES.has(trip.status))
        .length,
      tripsCompleted: tripsToday.filter((trip) => trip.status === TripStatus.COMPLETED).length,
      tripsDelayed: tripsToday.filter((trip) => trip.status === TripStatus.DELAYED).length,
      tripsCancelled: tripsToday.filter((trip) => trip.status === TripStatus.CANCELLED).length,
      tripsNotCompleted: tripsToday.filter(
        (trip) => trip.status === TripStatus.NOT_COMPLETED || trip.status === TripStatus.NO_SHOW,
      ).length,
      activeIncidents: tripsToday.filter((trip) => trip.status === TripStatus.INCIDENT).length,
      emergencies: incidentsToday.filter((incident) => incident.type === IncidentType.EMERGENCY)
        .length,
      vehiclesAvailable: vehicles.filter((vehicle) => vehicle.status === VehicleStatus.AVAILABLE)
        .length,
      vehiclesWithIssues: vehicles.filter(
        (vehicle) =>
          vehicle.status === VehicleStatus.IN_MAINTENANCE ||
          vehicle.status === VehicleStatus.OUT_OF_SERVICE,
      ).length,
      childrenTransportedToday: new Set(
        tripsToday
          .filter((trip) => trip.status === TripStatus.COMPLETED)
          .map((trip) => trip.passengerId),
      ).size,
    }
  }
}
