import { TripStatus } from '@/domain/enums/TripStatus'
import { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { TRIP_IN_PROGRESS_STATUSES } from '@/shared/constants/trip.constants'
import { formatDate } from '@/shared/utils/date'

import type { DashboardSummaryDto } from '../dto/DashboardSummaryDto'

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(): Promise<DashboardSummaryDto> {
    const [trips, vehicles] = await Promise.all([
      this.tripRepository.getTrips(),
      this.vehicleRepository.getVehicles(),
    ])

    const today = formatDate(new Date().toISOString())
    const tripsToday = trips.filter((trip) => formatDate(trip.scheduledDeparture) === today)

    return {
      tripsToday: tripsToday.length,
      tripsInProgress: tripsToday.filter((trip) => TRIP_IN_PROGRESS_STATUSES.has(trip.status))
        .length,
      tripsUpcoming: tripsToday.filter((trip) => trip.status === TripStatus.SCHEDULED).length,
      tripsCompleted: tripsToday.filter((trip) => trip.status === TripStatus.COMPLETED).length,
      tripsDelayed: tripsToday.filter((trip) => trip.status === TripStatus.DELAYED).length,
      activeIncidents: tripsToday.filter((trip) => trip.status === TripStatus.INCIDENT).length,
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
