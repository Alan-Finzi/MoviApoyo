import {
  collection,
  doc,
  getDoc,
  getDocs,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { Vehicle } from '@/domain/entities/Vehicle'
import type { VehicleStatus } from '@/domain/enums/VehicleStatus'
import type { VehicleRepository } from '@/domain/repositories/VehicleRepository'
import { createLicensePlate } from '@/domain/valueObjects/LicensePlate'
import { NotFoundError } from '@/shared/errors/AppError'

import { asDocumentShape } from '../firestoreData'

const COLLECTION = 'vehicles'

interface VehicleDocument {
  readonly licensePlate: string
  readonly brand: string
  readonly model: string
  readonly year: number
  readonly status: VehicleStatus
  readonly assignedDriverId: string | null
  readonly fuelLevelPercentage: number
  readonly odometerKm: number
  readonly notes?: string
}

function fromFirestore(id: string, data: DocumentData): Vehicle {
  const raw = asDocumentShape<VehicleDocument>(data)
  return {
    id,
    licensePlate: createLicensePlate(raw.licensePlate),
    brand: raw.brand,
    model: raw.model,
    year: raw.year,
    status: raw.status,
    assignedDriverId: raw.assignedDriverId ?? null,
    fuelLevelPercentage: raw.fuelLevelPercentage,
    odometerKm: raw.odometerKm,
    notes: raw.notes,
  }
}

export class FirestoreVehicleRepository implements VehicleRepository {
  constructor(private readonly firestore: Firestore) {}

  async getVehicles(): Promise<Vehicle[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async getVehicleById(id: string): Promise<Vehicle> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, id))
    if (!docSnap.exists()) throw new NotFoundError(`No existe el vehículo con id "${id}".`)
    return fromFirestore(docSnap.id, docSnap.data())
  }
}
