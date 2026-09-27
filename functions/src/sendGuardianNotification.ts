import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'

import { sendWhatsAppButtons, sendWhatsAppText } from './whatsappClient'

// Tipo que en la web dispara el mensaje con botones de Confirmar/Cancelar
// (ver src/domain/enums/NotificationType.ts) — el resto de los tipos son
// avisos informativos, solo texto.
const CONFIRMATION_REQUESTED_TYPE = 'CONFIRMACION_SOLICITADA'

async function getGuardianPhone(guardianId: string): Promise<string | null> {
  const doc = await getFirestore().collection('guardians').doc(guardianId).get()
  const phone = doc.data()?.phone as string | undefined
  return phone ?? null
}

// Envía por WhatsApp lo que la web ya deja escrito en Firestore (rule
// pedida: "revisar que las acciones usen el mismo flujo de negocio" — acá
// es al revés, la web no sabe ni necesita saber que existe WhatsApp, solo
// escribe en `notifications` como ya hacía antes de este trigger existir,
// ver el comentario en FirestoreNotificationRepository.subscribe()).
//
// Corre server-side a propósito: nunca en el navegador, para no exponer el
// access token de Meta en código que se descarga al cliente.
export const sendGuardianNotification = onDocumentCreated(
  'notifications/{notificationId}',
  async (event) => {
    const notification = event.data?.data()
    if (!notification) return

    const guardianId = notification.guardianId as string | undefined
    const tripId = notification.tripId as string | undefined
    const message = notification.message as string | undefined
    const type = notification.type as string | undefined
    if (!guardianId || !tripId || !message) return

    const phone = await getGuardianPhone(guardianId)
    if (!phone) {
      logger.warn('Notificación sin teléfono de familiar resuelto', { guardianId, tripId })
      return
    }

    try {
      if (type === CONFIRMATION_REQUESTED_TYPE) {
        await sendWhatsAppButtons(phone, message, [
          { id: `CONFIRM_TRIP:${tripId}`, title: 'Confirmar' },
          { id: `CANCEL_TRIP:${tripId}`, title: 'Cancelar' },
        ])
      } else {
        await sendWhatsAppText(phone, message)
      }
    } catch (error) {
      // No se propaga: fallar acá no debe reintentar el trigger de Firestore
      // indefinidamente. El estado "Enviada"/"Fallida" que ve el
      // coordinador en la web (NotificationStatus) ya lo decide
      // SendNotificationUseCase en el momento de escribir el documento, no
      // este trigger — ver limitación en README de esta carpeta.
      logger.error('No se pudo enviar la notificación por WhatsApp', { error, guardianId, tripId })
    }
  },
)
