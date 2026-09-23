import { addDoc, collection, getDocs, type DocumentData, type Firestore } from 'firebase/firestore'

import type { Incident } from '@/domain/entities/Incident'
import type { IncidentType } from '@/domain/enums/IncidentType'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'

import { asDocumentShape } from '../firestoreData'
import { stripUndefined } from '../stripUndefined'

const COLLECTION = 'incidents'

interface IncidentDocument {
  readonly tripId: string
  readonly type: IncidentType
  readonly description: string
  readonly timestamp: string
  readonly location?: GeoCoordinates
  readonly estimatedDelayMinutes: number
  readonly observations?: string
  readonly reportedBy: string
}

function fromFirestore(id: string, data: DocumentData): Incident {
  const raw = asDocumentShape<IncidentDocument>(data)
  return {
    id,
    tripId: raw.tripId,
    type: raw.type,
    description: raw.description,
    timestamp: raw.timestamp,
    location: raw.location,
    estimatedDelayMinutes: raw.estimatedDelayMinutes,
    observations: raw.observations,
    reportedBy: raw.reportedBy,
  }
}

export class FirestoreIncidentRepository implements IncidentRepository {
  constructor(private readonly firestore: Firestore) {}

  async getIncidents(): Promise<Incident[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async registerIncident(incident: Omit<Incident, 'id'>): Promise<Incident> {
    const docRef = await addDoc(collection(this.firestore, COLLECTION), stripUndefined(incident))
    return { ...incident, id: docRef.id }
  }
}
