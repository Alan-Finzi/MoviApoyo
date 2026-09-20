import { TripStatus } from '@/domain/enums/TripStatus'
import type { Trip } from '@/domain/entities/Trip'

import type { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

export class StartTripUseCase {
  constructor(private readonly updateTripStatusUseCase: UpdateTripStatusUseCase) {}

  execute(tripId: string): Promise<Trip> {
    return this.updateTripStatusUseCase.execute(tripId, TripStatus.ON_THE_WAY)
  }
}
