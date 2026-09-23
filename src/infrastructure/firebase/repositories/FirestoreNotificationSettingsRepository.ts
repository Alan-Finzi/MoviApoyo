import { doc, getDoc, setDoc, type Firestore } from 'firebase/firestore'

import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import { DEFAULT_BLOCK_LENGTH_METERS } from '@/shared/constants/app.constants'

import { asDocumentShape } from '../firestoreData'

const COLLECTION = 'settings'
const DOCUMENT_ID = 'notifications'

// Es un único documento (no una colección de muchos), así que si todavía no
// se guardó ninguna configuración se devuelve un valor por defecto
// razonable en vez de fallar.
const FALLBACK_SETTINGS: NotificationSettings = {
  criterion: ProximityCriterion.DISTANCE,
  distanceThresholdMeters: 300,
  timeThresholdMinutes: 5,
  blockLengthMeters: DEFAULT_BLOCK_LENGTH_METERS,
}

export class FirestoreNotificationSettingsRepository implements NotificationSettingsRepository {
  constructor(private readonly firestore: Firestore) {}

  async getSettings(): Promise<NotificationSettings> {
    const docSnap = await getDoc(doc(this.firestore, COLLECTION, DOCUMENT_ID))
    if (!docSnap.exists()) return FALLBACK_SETTINGS
    return asDocumentShape<NotificationSettings>(docSnap.data())
  }

  async updateSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    await setDoc(doc(this.firestore, COLLECTION, DOCUMENT_ID), settings)
    return settings
  }
}
