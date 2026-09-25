import type { PassengerDestination } from '@/domain/entities/PassengerDestination'

export interface PassengerDestinationRepository {
  getDestinationsByPassenger(passengerId: string): Promise<PassengerDestination[]>
  registerDestination(destination: Omit<PassengerDestination, 'id'>): Promise<PassengerDestination>
}
