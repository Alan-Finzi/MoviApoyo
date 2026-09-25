import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import type { PassengerDestinationRepository } from '@/domain/repositories/PassengerDestinationRepository'

export class GetPassengerDestinationsUseCase {
  constructor(private readonly repository: PassengerDestinationRepository) {}

  execute(passengerId: string): Promise<PassengerDestination[]> {
    return this.repository.getDestinationsByPassenger(passengerId)
  }
}
