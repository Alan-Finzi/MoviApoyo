import type { Trip } from '@/domain/entities/Trip'
import type { TripEvent } from '@/domain/entities/TripEvent'

export type TripMutableFields = Partial<
  Pick<Trip, 'status' | 'delayMinutes' | 'estimatedArrival' | 'currentLocation'>
>

// La UI y los casos de uso nunca saben si esto lee de una API real o de
// datos en memoria: solo conocen este contrato (rule 21).
export interface TripRepository {
  getTrips(): Promise<Trip[]>
  getTripById(id: string): Promise<Trip>
  updateTrip(id: string, changes: TripMutableFields): Promise<Trip>
  appendTripEvent(id: string, event: Omit<TripEvent, 'id'>): Promise<Trip>
  markMilestoneNotified(id: string, milestone: string): Promise<Trip>
  // Avisa a la capa de presentación que los traslados cambiaron, sin
  // exponer cómo se almacenan (rule 21). MockTripRepository lo resuelve con
  // un pub-sub en memoria; una implementación real podría usar WebSockets o
  // polling detrás del mismo contrato.
  subscribe(listener: () => void): () => void
}
