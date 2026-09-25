import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import type { PassengerDestinationRepository } from '@/domain/repositories/PassengerDestinationRepository'

import { passengerDestinationsStore } from './stores'

export class MockPassengerDestinationRepository implements PassengerDestinationRepository {
  getDestinationsByPassenger(passengerId: string): Promise<PassengerDestination[]> {
    return Promise.resolve(
      passengerDestinationsStore.getState().filter((item) => item.passengerId === passengerId),
    )
  }

  registerDestination(
    destination: Omit<PassengerDestination, 'id'>,
  ): Promise<PassengerDestination> {
    const newDestination: PassengerDestination = {
      ...destination,
      id: `destination-${crypto.randomUUID()}`,
    }
    passengerDestinationsStore.setState((destinations) => [...destinations, newDestination])
    return Promise.resolve(newDestination)
  }
}
