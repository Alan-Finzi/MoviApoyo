import type { Passenger } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'

export class GetPassengersUseCase {
  constructor(private readonly passengerRepository: PassengerRepository) {}

  execute(): Promise<Passenger[]> {
    return this.passengerRepository.getPassengers()
  }
}
