import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const COLLECTION = 'whatsappConversationState'
// El familiar tiene una ventana corta para responder el motivo antes de que
// se lo vuelva a tratar como un mensaje suelto (ver docs/whatsapp-bot.md,
// "Conversaciones con más de un paso" — esta es la versión mínima: un solo
// paso pendiente, sin encadenar varios).
const EXPIRATION_MINUTES = 30

export interface AwaitingCancellationReason {
  readonly step: 'AWAITING_CANCELLATION_REASON'
  readonly tripId: string
  readonly guardianFullName: string
  readonly relationship: string
}

export async function setAwaitingCancellationReason(
  phone: string,
  state: Omit<AwaitingCancellationReason, 'step'>,
): Promise<void> {
  await getFirestore()
    .collection(COLLECTION)
    .doc(phone)
    .set({
      step: 'AWAITING_CANCELLATION_REASON',
      ...state,
      expiresAt: Timestamp.fromMillis(Date.now() + EXPIRATION_MINUTES * 60 * 1000),
    })
}

export async function consumeAwaitingCancellationReason(
  phone: string,
): Promise<AwaitingCancellationReason | null> {
  const docRef = getFirestore().collection(COLLECTION).doc(phone)
  const snapshot = await docRef.get()
  if (!snapshot.exists) return null

  await docRef.delete()

  const data = snapshot.data()
  const expiresAt = data?.expiresAt as Timestamp | undefined
  if (!data || data.step !== 'AWAITING_CANCELLATION_REASON' || !expiresAt) return null
  if (expiresAt.toMillis() < Date.now()) return null

  return {
    step: 'AWAITING_CANCELLATION_REASON',
    tripId: data.tripId as string,
    guardianFullName: data.guardianFullName as string,
    relationship: data.relationship as string,
  }
}
