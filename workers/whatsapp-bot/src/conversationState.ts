import { deleteDocument, getDocument, setDocument, toFirestoreTimestamp } from './firestoreRest'
import type { Env } from './types'

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
  env: Env,
  phone: string,
  state: Omit<AwaitingCancellationReason, 'step'>,
): Promise<void> {
  await setDocument(env, `${COLLECTION}/${phone}`, {
    step: 'AWAITING_CANCELLATION_REASON',
    ...state,
    expiresAt: toFirestoreTimestamp(new Date(Date.now() + EXPIRATION_MINUTES * 60 * 1000).toISOString()),
  })
}

export async function consumeAwaitingCancellationReason(
  env: Env,
  phone: string,
): Promise<AwaitingCancellationReason | null> {
  const doc = await getDocument(env, `${COLLECTION}/${phone}`)
  if (!doc) return null

  await deleteDocument(env, `${COLLECTION}/${phone}`)

  const expiresAt = doc.data.expiresAt
  if (doc.data.step !== 'AWAITING_CANCELLATION_REASON' || typeof expiresAt !== 'string') return null
  if (new Date(expiresAt).getTime() < Date.now()) return null

  return {
    step: 'AWAITING_CANCELLATION_REASON',
    tripId: doc.data.tripId as string,
    guardianFullName: doc.data.guardianFullName as string,
    relationship: doc.data.relationship as string,
  }
}
