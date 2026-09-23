import type { Passenger } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'

export class GetPassengerByIdUseCase {
  constructor(private readonly passengerRepository: PassengerRepository) {}

  execute(passengerId: string): Promise<Passenger> {
    return this.passengerRepository.getPassengerById(passengerId)
  }
}
