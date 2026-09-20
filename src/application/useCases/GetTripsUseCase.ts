import { getDriverFullName } from '@/domain/entities/Driver'
import { getPassengerFullName } from '@/domain/entities/Passenger'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { NotFoundError } from '@/shared/errors/AppError'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import type { TripListItemDto } from '../dto/TripListItemDto'

export class GetTripsUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly driverRepository: DriverRepository,
    private readonly vehicleRepository: VehicleRepository,
  ) {}

  async execute(): Promise<TripListItemDto[]> {
    const [trips, passengers, drivers, vehicles] = await Promise.all([
      this.tripRepository.getTrips(),
      this.passengerRepository.getPassengers(),
      this.driverRepository.getDrivers(),
      this.vehicleRepository.getVehicles(),
    ])

    const passengerById = new Map(passengers.map((passenger) => [passenger.id, passenger]))
    const driverById = new Map(drivers.map((driver) => [driver.id, driver]))
    const vehicleById = new Map(vehicles.map((vehicle) => [vehicle.id, vehicle]))

    return trips
      .map((trip): TripListItemDto => {
        const passenger = passengerById.get(trip.passengerId)
        const driver = driverById.get(trip.driverId)
        const vehicle = vehicleById.get(trip.vehicleId)
        if (!passenger || !driver || !vehicle) {
          throw new NotFoundError(`Datos incompletos para el traslado ${trip.id}.`)
        }
        return {
          id: trip.id,
          childFullName: getPassengerFullName(passenger),
          scheduledDeparture: trip.scheduledDeparture,
          estimatedArrival: trip.estimatedArrival,
          originLabel: trip.origin.street,
          destinationLabel: trip.destination.street,
          driverId: driver.id,
          driverName: getDriverFullName(driver),
          vehicleId: vehicle.id,
          vehiclePlate: formatVehiclePlate(vehicle.licensePlate),
          status: trip.status,
          delayMinutes: trip.delayMinutes,
        }
      })
      .sort((a, b) => a.scheduledDeparture.localeCompare(b.scheduledDeparture))
  }
}
