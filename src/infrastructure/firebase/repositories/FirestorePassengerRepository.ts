import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { PassengerBloodType } from '@/domain/enums/PassengerBloodType'
import { PassengerStatus } from '@/domain/enums/PassengerStatus'
import type { PassengerSex } from '@/domain/enums/PassengerSex'
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
  readonly birthDate?: string
  readonly sex?: PassengerSex
  readonly homeAddress: Address
  readonly destinationAddress: Address
  readonly guardianId: string
  readonly photoUrl?: string
  readonly status?: PassengerStatus
  readonly operationalNotes?: string
  readonly createdAt?: string
  readonly updatedAt?: string
}

interface PassengerSensitiveDocument {
  readonly documentNumber?: string
  readonly bloodType?: PassengerBloodType
  readonly allergies?: readonly string[]
  readonly medicalNotes?: string
  readonly observations?: string
  readonly updatedAt?: string
}

// status/createdAt/updatedAt son nuevos (ver PassengerDetailPage) — los
// documentos ya existentes en Firestore no los tienen. Se completan con un
// valor por defecto acá en vez de migrar los datos (no es necesario romper
// la lectura de pacientes ya cargados por un campo que antes no existía).
function fromFirestore(id: string, data: DocumentData): Passenger {
  const raw = asDocumentShape<PassengerDocument>(data)
  return {
    id,
    firstName: raw.firstName,
    lastName: raw.lastName,
    birthDate: raw.birthDate,
    sex: raw.sex,
    homeAddress: raw.homeAddress,
    destinationAddress: raw.destinationAddress,
    guardianId: raw.guardianId,
    photoUrl: raw.photoUrl,
    status: raw.status ?? PassengerStatus.ACTIVE,
    operationalNotes: raw.operationalNotes,
    createdAt: raw.createdAt ?? new Date(0).toISOString(),
    updatedAt: raw.updatedAt ?? new Date(0).toISOString(),
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

  async registerPassenger(
    passenger: Omit<Passenger, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Passenger> {
    const now = new Date().toISOString()
    const toWrite = { ...passenger, createdAt: now, updatedAt: now }
    const docRef = await addDoc(collection(this.firestore, COLLECTION), stripUndefined(toWrite))
    return { ...toWrite, id: docRef.id }
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
      bloodType: raw.bloodType,
      allergies: raw.allergies,
      medicalNotes: raw.medicalNotes,
      observations: raw.observations,
      updatedAt: raw.updatedAt,
    }
  }

  async updateSensitiveInfo(
    passengerId: string,
    info: Omit<PassengerSensitiveInfo, 'passengerId' | 'updatedAt'>,
  ): Promise<PassengerSensitiveInfo> {
    const updated: PassengerSensitiveInfo = {
      ...info,
      passengerId,
      updatedAt: new Date().toISOString(),
    }
    await setDoc(
      doc(this.firestore, SENSITIVE_COLLECTION, passengerId),
      stripUndefined({ ...info, updatedAt: updated.updatedAt }),
    )
    return updated
  }
}
