import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { Address } from '@/domain/valueObjects/Address'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { asDocumentShape } from '../firestoreData'
import { stripUndefined } from '../stripUndefined'

const COLLECTION = 'passengers'
// Colección separada a propósito (rule 12): permite reglas de seguridad más
// estrictas sobre datos sensibles sin tocar la colección pública.
const SENSITIVE_COLLECTION = 'passengerSensitiveInfo'

interface PassengerDocument {
  readonly firstName: string
  readonly lastName: string
  readonly homeAddress: Address
  readonly destinationAddress: Address
  readonly guardianId: string
  readonly photoUrl?: string
}

interface PassengerSensitiveDocument {
  readonly documentNumber?: string
  readonly medicalNotes?: string
  readonly observations?: string
}

function fromFirestore(id: string, data: DocumentData): Passenger {
  const raw = asDocumentShape<PassengerDocument>(data)
  return {
    id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    homeAddress: raw.homeAddress,
    destinationAddress: raw.destinationAddress,
    guardianId: raw.guardianId,
    photoUrl: raw.photoUrl,
  }
}

export class FirestorePassengerRepository implements PassengerRepository {
  constructor(private readonly firestore: Firestore) {}

  async getPassengers(): Promise<Passenger[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async getPassengerById(id: string): Promise<Passenger> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, id))
    if (!docSnap.exists()) throw new NotFoundError(`No existe el paciente con id "${id}".`)
    return fromFirestore(docSnap.id, docSnap.data())
  }

  async registerPassenger(passenger: Omit<Passenger, 'id'>): Promise<Passenger> {
    const docRef = await addDoc(collection(this.firestore, COLLECTION), stripUndefined(passenger))
    return { ...passenger, id: docRef.id }
  }

  async getSensitiveInfo(passengerId: string): Promise<PassengerSensitiveInfo> {
    const docSnap = await getDoc(doc(this.firestore, SENSITIVE_COLLECTION, passengerId))
    if (!docSnap.exists()) {
      throw new NotFoundError(`No hay información sensible registrada para "${passengerId}".`)
    }
    const raw = asDocumentShape<PassengerSensitiveDocument>(docSnap.data())
    return {
      passengerId,
      documentNumber: raw.documentNumber,
      medicalNotes: raw.medicalNotes,
      observations: raw.observations,
    }
  }
}
