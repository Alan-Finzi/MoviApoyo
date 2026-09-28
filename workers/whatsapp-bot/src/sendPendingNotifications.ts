import { fieldEquals, getDocument, patchDocument, runQuery } from './firestoreRest'
import type { Env } from './types'
import { sendWhatsAppButtons, sendWhatsAppText } from './whatsappClient'

// Tipo que en la web dispara el mensaje con botones de Confirmar/Cancelar
// (ver src/domain/enums/NotificationType.ts) — el resto de los tipos son
// avisos informativos, solo texto.
const CONFIRMATION_REQUESTED_TYPE = 'CONFIRMACION_SOLICITADA'

// Cuántas notificaciones pendientes procesa como máximo cada corrida del
// cron (ver index.ts, corre cada 1 minuto) — de sobra para el volumen de
// esta app; si algún minuto se generaran más, las que sobran esperan a la
// corrida siguiente en vez de bloquear todo.
const BATCH_LIMIT = 50

async function getGuardianPhone(env: Env, guardianId: string): Promise<string | null> {
  const doc = await getDocument(env, `guardians/${guardianId}`)
  return (doc?.data.phone as string | undefined) ?? null
}

// Reemplaza al trigger `onDocumentCreated('notifications/{id}')` de la
// versión con Firebase Functions (Cloudflare Workers no puede quedarse
// escuchando cambios en Firestore) — en vez de reaccionar al instante, esto
// corre por cron y busca lo que la web (FirestoreNotificationRepository) o
// el propio webhook (whatsappWebhook.ts) dejaron con `whatsappSentAt: null`.
// Ninguno de los dos "sabe" que existe este cron: solo escriben en
// `notifications` como ya hacían antes, igual que documenta el comentario
// en FirestoreNotificationRepository.subscribe() del lado de la web.
export async function sendPendingNotifications(env: Env): Promise<void> {
  const pending = await runQuery(env, {
    from: [{ collectionId: 'notifications' }],
    where: fieldEquals('whatsappSentAt', null),
    limit: BATCH_LIMIT,
  })

  for (const notification of pending) {
    const guardianId = notification.data.guardianId as string | undefined
    const tripId = notification.data.tripId as string | undefined
    const message = notification.data.message as string | undefined
    const type = notification.data.type as string | undefined

    if (!guardianId || !tripId || !message) {
      await markProcessed(env, notification.id)
      continue
    }

    const phone = await getGuardianPhone(env, guardianId)
    if (!phone) {
      console.warn('Notificación sin teléfono de familiar resuelto', { guardianId, tripId })
      await markProcessed(env, notification.id)
      continue
    }

    try {
      if (type === CONFIRMATION_REQUESTED_TYPE) {
        await sendWhatsAppButtons(env, phone, message, [
          { id: `CONFIRM_TRIP:${tripId}`, title: 'Confirmar' },
          { id: `CANCEL_TRIP:${tripId}`, title: 'Cancelar' },
        ])
      } else {
        await sendWhatsAppText(env, phone, message)
      }
    } catch (error) {
      // No se reintenta indefinidamente (mismo criterio que el trigger
      // original): se marca procesada igual, el error queda solo en los
      // logs (`wrangler tail`). El estado "Enviada"/"Fallida" que ve el
      // coordinador en la web lo decide SendNotificationUseCase al escribir
      // el documento, no este cron.
      console.error('No se pudo enviar la notificación por WhatsApp', { error, guardianId, tripId })
    }

    await markProcessed(env, notification.id)
  }
}

async function markProcessed(env: Env, notificationId: string): Promise<void> {
  await patchDocument(env, `notifications/${notificationId}`, {
    whatsappSentAt: new Date().toISOString(),
  })
}
