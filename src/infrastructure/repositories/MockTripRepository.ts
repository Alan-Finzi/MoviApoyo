import type { Trip } from '@/domain/entities/Trip'
import type { TripEvent } from '@/domain/entities/TripEvent'
import type { TripMutableFields, TripRepository } from '@/domain/repositories/TripRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { tripsStore } from './stores'

export class MockTripRepository implements TripRepository {
  getTrips(): Promise<Trip[]> {
    return Promise.resolve(tripsStore.getState())
  }

  getTripById(id: string): Promise<Trip> {
    const trip = tripsStore.getState().find((item) => item.id === id)
    if (!trip) throw new NotFoundError(`No existe el traslado con id "${id}".`)
    return Promise.resolve(trip)
  }

  updateTrip(id: string, changes: TripMutableFields): Promise<Trip> {
    return Promise.resolve(this.mutate(id, (trip) => ({ ...trip, ...changes })))
  }

  appendTripEvent(id: string, event: Omit<TripEvent, 'id'>): Promise<Trip> {
    return Promise.resolve(
      this.mutate(id, (trip) => ({
        ...trip,
        events: [...trip.events, { ...event, id: `event-${crypto.randomUUID()}` }],
      })),
    )
  }

  markMilestoneNotified(id: string, milestone: string): Promise<Trip> {
    return Promise.resolve(
      this.mutate(id, (trip) =>
        trip.notifiedMilestones.includes(milestone)
          ? trip
          : { ...trip, notifiedMilestones: [...trip.notifiedMilestones, milestone] },
      ),
    )
  }

  subscribe(listener: () => void): () => void {
    return tripsStore.subscribe(listener)
  }

  private mutate(id: string, updater: (trip: Trip) => Trip): Trip {
    let updatedTrip: Trip | undefined

    tripsStore.setState((trips) =>
      trips.map((trip) => {
        if (trip.id !== id) return trip
        updatedTrip = updater(trip)
        return updatedTrip
      }),
    )

    if (!updatedTrip) throw new NotFoundError(`No existe el traslado con id "${id}".`)
    return updatedTrip
  }
}
