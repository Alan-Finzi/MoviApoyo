import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'

import type { TripDetailDto } from '../dto/TripDetailDto'

export class GetTripByIdUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly driverRepository: DriverRepository,
    private readonly vehicleRepository: VehicleRepository,
    private readonly guardianRepository: GuardianRepository,
  ) {}

  async execute(tripId: string): Promise<TripDetailDto> {
    const trip = await this.tripRepository.getTripById(tripId)
    const [passenger, driver, vehicle] = await Promise.all([
      this.passengerRepository.getPassengerById(trip.passengerId),
      this.driverRepository.getDriverById(trip.driverId),
      this.vehicleRepository.getVehicleById(trip.vehicleId),
    ])
    const guardian = await this.guardianRepository.getGuardianById(passenger.guardianId)

    return { trip, passenger, driver, vehicle, guardian }
  }
}
