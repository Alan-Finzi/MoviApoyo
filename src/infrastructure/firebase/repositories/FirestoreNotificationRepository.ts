import {
  addDoc,
  collection,
  getDocs,
  onSnapshot,
  type DocumentData,
  type Firestore,
} from 'firebase/firestore'

import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationChannel } from '@/domain/enums/NotificationChannel'
import type { NotificationStatus } from '@/domain/enums/NotificationStatus'
import type { NotificationType } from '@/domain/enums/NotificationType'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'

import { asDocumentShape } from '../firestoreData'

const COLLECTION = 'notifications'

interface NotificationDocument {
  readonly tripId: string
  readonly guardianId: string
  readonly type: NotificationType
  readonly channel: NotificationChannel
  readonly message: string
  readonly status: NotificationStatus
  readonly createdAt: string
}

function fromFirestore(id: string, data: DocumentData): AppNotification {
  const raw = asDocumentShape<NotificationDocument>(data)
  return {
    id,
    tripId: raw.tripId,
    guardianId: raw.guardianId,
    type: raw.type,
    channel: raw.channel,
    message: raw.message,
    status: raw.status,
    createdAt: raw.createdAt,
  }
}

export class FirestoreNotificationRepository implements NotificationRepository {
  constructor(private readonly firestore: Firestore) {}

  async getNotifications(): Promise<AppNotification[]> {
    const snapshot = await getDocs(collection(this.firestore, COLLECTION))
    return snapshot.docs.map((docSnap) => fromFirestore(docSnap.id, docSnap.data()))
  }

  async saveNotification(notification: Omit<AppNotification, 'id'>): Promise<AppNotification> {
    const docRef = await addDoc(collection(this.firestore, COLLECTION), notification)
    return { ...notification, id: docRef.id }
  }

  // onSnapshot es en tiempo real de verdad (a diferencia del pub-sub en
  // memoria de MockNotificationRepository): cualquier notificación que
  // escriba la futura Cloud Function del bot de WhatsApp aparece acá sin
  // que nadie tenga que hacer polling.
  subscribe(listener: () => void): () => void {
    return onSnapshot(collection(this.firestore, COLLECTION), () => {
      listener()
    })
  }
}
