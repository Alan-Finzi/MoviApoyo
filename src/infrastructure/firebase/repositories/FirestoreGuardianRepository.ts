import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Guardian } from '@/domain/entities/Guardian'
import type { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { GuardianRepository } from '@/domain/repositories/GuardianRepository'
import { createPhoneNumber } from '@/domain/valueObjects/PhoneNumber'
import { NotFoundError } from '@/shared/errors/AppError'

import { asDocumentShape } from '../firestoreData'

const COLLECTION = 'guardians'

interface GuardianDocument {
  readonly fullName: string
  readonly phone: string
  readonly relationship: string
  readonly notificationChannels?: readonly NotificationChannel[]
}

function fromFirestore(id: string, data: DocumentData): Guardian {
  const raw = asDocumentShape<GuardianDocument>(data)
  return {
    id,
    fullName: raw.fullName,
    phone: createPhoneNumber(raw.phone),
    relationship: raw.relationship,
    notificationChannels: raw.notificationChannels ?? [],
  }
}

export class FirestoreGuardianRepository implements GuardianRepository {
  constructor(private readonly firestore: Firestore) {}

  async getGuardians(): Promise<Guardian[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async getGuardianById(id: string): Promise<Guardian> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, id))
    if (!docSnap.exists()) throw new NotFoundError(`No existe el tutor con id "${id}".`)
    return fromFirestore(docSnap.id, docSnap.data())
  }
}
