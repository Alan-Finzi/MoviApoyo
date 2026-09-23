import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Driver } from '@/domain/entities/Driver'
import type { DriverStatus } from '@/domain/enums/DriverStatus'
import type { DriverRepository } from '@/domain/repositories/DriverRepository'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'
import { NotFoundError } from '@/shared/errors/AppError'

import { asDocumentShape } from '../firestoreData'

const COLLECTION = 'drivers'

interface DriverDocument {
  readonly firstName: string
  readonly lastName: string
  readonly phone: string
  readonly assignedVehicleId: string | null
  readonly status: DriverStatus
  readonly photoUrl?: string
}

function fromFirestore(id: string, data: DocumentData): Driver {
  const raw = asDocumentShape<DriverDocument>(data)
  return {
    id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    phone: createPhoneNumber(raw.phone),
    assignedVehicleId: raw.assignedVehicleId ?? null,
    status: raw.status,
    photoUrl: raw.photoUrl,
  }
}

// Implementación real sobre Firestore (rule: "guardar viajes, rutas,
// choferes..."). Sigue exactamente el mismo contrato que MockDriverRepository
// — nada fuera de app/providers/dependencies.ts sabe cuál de las dos está
// activa.
export class FirestoreDriverRepository implements DriverRepository {
  constructor(private readonly firestore: Firestore) {}

  async getDrivers(): Promise<Driver[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async getDriverById(id: string): Promise<Driver> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, id))
    if (!docSnap.exists()) throw new NotFoundError(`No existe el chofer con id "${id}".`)
    return fromFirestore(docSnap.id, docSnap.data())
  }
}
