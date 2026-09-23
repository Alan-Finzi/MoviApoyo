import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Trip } from '@/domain/entities/Trip'
import type { TripEvent } from '@/domain/entities/TripEvent'
import type { TripStatus } from '@/domain/enums/TripStatus'
import type { TripMutableFields, TripRepository } from '@/domain/repositories/TripRepository'
import type { Address, GeoCoordinates } from '@/domain/valueObjects/Address'
import { NotFoundError } from '@/shared/errors/AppError'

import { asDocumentShape } from '../firestoreData'
import { stripUndefined } from '../stripUndefined'

const COLLECTION = 'trips'

interface TripDocument {
  readonly passengerId: string
  readonly driverId: string
  readonly vehicleId: string
  readonly origin: Address
  readonly destination: Address
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  readonly status: TripStatus
  readonly delayMinutes: number
  readonly currentLocation?: GeoCoordinates | null
  readonly events?: readonly TripEvent[]
  readonly notifiedMilestones?: readonly string[]
  readonly actualDepartureAt?: string | null
  readonly actualArrivalAt?: string | null
}

function fromFirestore(id: string, data: DocumentData): Trip {
  const raw = asDocumentShape<TripDocument>(data)
  return {
    id,
    passengerId: raw.passengerId,
    driverId: raw.driverId,
    vehicleId: raw.vehicleId,
    origin: raw.origin,
    destination: raw.destination,
    scheduledDeparture: raw.scheduledDeparture,
    estimatedArrival: raw.estimatedArrival,
    status: raw.status,
    delayMinutes: raw.delayMinutes,
    currentLocation: raw.currentLocation ?? null,
    events: raw.events ?? [],
    notifiedMilestones: raw.notifiedMilestones ?? [],
    actualDepartureAt: raw.actualDepartureAt ?? null,
    actualArrivalAt: raw.actualArrivalAt ?? null,
  }
}

// Guarda "viajes, rutas realizadas, kilómetros, tiempos" (el pedido
// original): cada traslado finalizado queda en Firestore con sus horarios
// reales (actualDepartureAt/actualArrivalAt), listo para que
// GetScheduleRecommendationUseCase (u otra analítica futura) lo consulte.
export class FirestoreTripRepository implements TripRepository {
  constructor(private readonly firestore: Firestore) {}

  async getTrips(): Promise<Trip[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async getTripById(id: string): Promise<Trip> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, id))
    if (!docSnap.exists()) throw new NotFoundError(`No existe el traslado con id "${id}".`)
    return fromFirestore(docSnap.id, docSnap.data())
  }

  async updateTrip(id: string, changes: TripMutableFields): Promise<Trip> {
    await updateDoc(doc(this.firestore, COLLECTION, id), stripUndefined(changes))
    return this.getTripById(id)
  }

  async appendTripEvent(id: string, event: Omit<TripEvent, 'id'>): Promise<Trip> {
    const newEvent: TripEvent = { ...event, id: crypto.randomUUID() }
    await updateDoc(doc(this.firestore, COLLECTION, id), {
      events: arrayUnion(stripUndefined(newEvent)),
    })
    return this.getTripById(id)
  }

  async markMilestoneNotified(id: string, milestone: string): Promise<Trip> {
    await updateDoc(doc(this.firestore, COLLECTION, id), {
      notifiedMilestones: arrayUnion(milestone),
    })
    return this.getTripById(id)
  }

  subscribe(listener: () => void): () => void {
    return onSnapshot(collection(this.firestore, COLLECTION), () => {
      listener()
    })
  }
}
