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
    // whatsappSentAt: null es la marca que busca el cron del bot de WhatsApp
    // (workers/whatsapp-bot/src/sendPendingNotifications.ts, corre cada 1
    // minuto) para saber que todavía no se mandó — sin esto puesto de
    // entrada, su consulta `== null` no encontraría el documento (un campo
    // ausente no matchea, tiene que estar presente y en null). Este
    // repositorio no sabe ni necesita saber que WhatsApp existe más allá de
    // esta marca (mismo criterio que ya describe el comentario de
    // subscribe() más abajo).
    const docRef = await addDoc(collection(this.firestore, COLLECTION), {
      ...notification,
      whatsappSentAt: null,
    })
    return { ...notification, id: docRef.id }
  }

  // onSnapshot es en tiempo real de verdad (a diferencia del pub-sub en
  // memoria de MockNotificationRepository): cualquier notificación que
  // marque como enviada el bot de WhatsApp (ver workers/whatsapp-bot/)
  // aparece acá sin que nadie tenga que hacer polling del lado de la web.
  subscribe(listener: () => void): () => void {
    return onSnapshot(collection(this.firestore, COLLECTION), () => {
      listener()
    })
  }
}
