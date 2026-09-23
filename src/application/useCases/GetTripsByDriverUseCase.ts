import type { TripListItemDto } from '../dto/TripListItemDto'
import type { GetTripsUseCase } from './GetTripsUseCase'

// Arma la lista de viajes de la ficha del chofer, reutilizando el mismo
// join que ya hace GetTripsUseCase.
export class GetTripsByDriverUseCase {
  constructor(private readonly getTripsUseCase: GetTripsUseCase) {}

  async execute(driverId: string): Promise<TripListItemDto[]> {
    const trips = await this.getTripsUseCase.execute()
    return trips.filter((trip) => trip.driverId === driverId)
  }
}
