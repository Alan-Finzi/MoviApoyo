import type { TripListItemDto } from '../dto/TripListItemDto'
import type { GetTripsUseCase } from './GetTripsUseCase'

// Se apoya en GetTripsUseCase (no repite el join) para armar la pestaña
// "Viajes" de la ficha del paciente.
export class GetTripsByPassengerUseCase {
  constructor(private readonly getTripsUseCase: GetTripsUseCase) {}

  async execute(passengerId: string): Promise<TripListItemDto[]> {
    const trips = await this.getTripsUseCase.execute()
    return trips.filter((trip) => trip.passengerId === passengerId)
  }
}
