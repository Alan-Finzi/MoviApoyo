import { getFirestore } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

// Estados de traslado en los que tiene sentido actualizar la ubicación del
// vehículo (equivalente a ACTIVE_STATUSES en
// src/infrastructure/services/TripSimulationEngine.ts, pero duplicado acá:
// este proyecto de Cloud Functions compila por separado del frontend, ver
// README de esta carpeta).
const ACTIVE_TRIP_STATUSES = [
  'EN_CAMINO_AL_DOMICILIO',
  'CERCA_DEL_DOMICILIO',
  'LLEGANDO',
  'NIÑO_RECOGIDO',
  'EN_TRASLADO',
  'CERCA_DEL_DESTINO',
]

interface WhatsAppLocation {
  readonly latitude: number
  readonly longitude: number
}

interface WhatsAppMessage {
  readonly from: string
  readonly type: string
  readonly location?: WhatsAppLocation
}

// Forma mínima del payload que manda Meta (el real trae mucho más:
// metadata, contacts, etc.). Solo se tipa lo que este webhook usa.
export interface WhatsAppWebhookPayload {
  readonly entry?: ReadonlyArray<{
    readonly changes?: ReadonlyArray<{
      readonly value?: {
        readonly messages?: readonly WhatsAppMessage[]
      }
    }>
  }>
}

function extractMessages(payload: WhatsAppWebhookPayload): readonly WhatsAppMessage[] {
  return (payload.entry ?? []).flatMap((entry) =>
    (entry.changes ?? []).flatMap((change) => change.value?.messages ?? []),
  )
}

async function findDriverIdByPhone(phone: string): Promise<string | null> {
  const snapshot = await getFirestore()
    .collection('drivers')
    .where('phone', '==', phone)
    .limit(1)
    .get()
  return snapshot.empty ? null : (snapshot.docs[0]?.id ?? null)
}

async function findActiveTripIdForDriver(driverId: string): Promise<string | null> {
  const snapshot = await getFirestore()
    .collection('trips')
    .where('driverId', '==', driverId)
    .where('status', 'in', ACTIVE_TRIP_STATUSES)
    .limit(1)
    .get()
  return snapshot.empty ? null : (snapshot.docs[0]?.id ?? null)
}

async function updateTripLocation(tripId: string, location: WhatsAppLocation): Promise<void> {
  await getFirestore()
    .collection('trips')
    .doc(tripId)
    .update({ currentLocation: { latitude: location.latitude, longitude: location.longitude } })
}

// Procesa los mensajes entrantes del webhook de WhatsApp Business API.
//
// Implementado: identificar al chofer por su número de teléfono y
// actualizar la ubicación de su traslado activo cuando comparte su
// ubicación (la función nativa "Compartir ubicación" de WhatsApp).
//
// Todavía NO implementado (ver docs/whatsapp-bot.md en la raíz del repo
// para el diseño completo): botones de confirmación de recogida/entrega,
// el flujo de varios pasos para reportar un incidente, las consultas de
// los padres, y el envío de la respuesta de WhatsApp (sendWhatsAppMessage
// todavía no existe — hace falta un token real de Meta, ver
// docs/firebase.md).
export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  const messages = extractMessages(payload)

  for (const message of messages) {
    const driverId = await findDriverIdByPhone(message.from)
    if (!driverId) {
      logger.warn('Mensaje de WhatsApp de un número no reconocido', { from: message.from })
      continue
    }

    if (message.type === 'location' && message.location) {
      const tripId = await findActiveTripIdForDriver(driverId)
      if (!tripId) {
        logger.warn('El chofer no tiene un traslado activo en este momento', { driverId })
        continue
      }
      await updateTripLocation(tripId, message.location)
      logger.info('Ubicación actualizada desde WhatsApp', { tripId, driverId })
      continue
    }

    logger.info('Tipo de mensaje sin manejador todavía (ver docs/whatsapp-bot.md)', {
      driverId,
      type: message.type,
    })
  }
}
