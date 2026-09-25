import {
  addDoc,
  collection,
  getDocs,
  query,
  where,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import type { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import type { Weekday } from '@/domain/enums/Weekday'
import type { PassengerDestinationRepository } from '@/domain/repositories/PassengerDestinationRepository'
import type { Address } from '@/domain/valueObjects/Address'

import { asDocumentShape } from '../firestoreData'
import { stripUndefined } from '../stripUndefined'

const COLLECTION = 'passengerDestinations'

interface PassengerDestinationDocument {
  readonly passengerId: string
  readonly label: string
  readonly address: Address
  readonly recurrence: DestinationRecurrence
  readonly weekdays: readonly Weekday[]
  readonly specificDate: string | null
  readonly time: string
}

function fromFirestore(id: string, data: DocumentData): PassengerDestination {
  const raw = asDocumentShape<PassengerDestinationDocument>(data)
  return {
    id,
    passengerId: raw.passengerId,
    label: raw.label,
    address: raw.address,
    recurrence: raw.recurrence,
    weekdays: raw.weekdays ?? [],
    specificDate: raw.specificDate ?? null,
    time: raw.time,
  }
}

export class FirestorePassengerDestinationRepository implements PassengerDestinationRepository {
  constructor(private readonly firestore: Firestore) {}

  async getDestinationsByPassenger(passengerId: string): Promise<PassengerDestination[]> {
    const snapshot = await getDocs(
      query(collection(this.firestore, COLLECTION), where('passengerId', '==', passengerId)),
    )
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async registerDestination(
    destination: Omit<PassengerDestination, 'id'>,
  ): Promise<PassengerDestination> {
    const docRef = await addDoc(collection(this.firestore, COLLECTION), stripUndefined(destination))
    return { ...destination, id: docRef.id }
  }
}
