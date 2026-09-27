import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import * as logger from 'firebase-functions/logger'

import {
  consumeAwaitingCancellationReason,
  setAwaitingCancellationReason,
} from './conversationState'
import { tryMarkMessageAsProcessed } from './dedupe'
import { identifySender } from './identity'
import { canTransition, eventTypeForStatus, TripStatus } from './tripStatusMachine'
import { sendWhatsAppButtons, sendWhatsAppText, type WhatsAppButton } from './whatsappClient'

// Traslados que todavía pueden avanzar — se usa tanto para "cuál es el
// traslado relevante de este chofer ahora mismo" como, indirectamente, para
// no ofrecer acciones sobre un traslado ya cerrado.
const NON_TERMINAL_STATUSES = [
  TripStatus.SCHEDULED,
  TripStatus.CONFIRMATION_PENDING,
  TripStatus.CONFIRMED,
  TripStatus.DRIVER_ACCEPTED,
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
  TripStatus.ARRIVED_AT_DESTINATION,
  TripStatus.DELAYED,
  TripStatus.INCIDENT,
]

// "Camino feliz" en orden — ver HAPPY_PATH_TRIP_STATUSES en
// src/domain/services/TripStatusMachine.ts (mismo criterio, duplicado acá,
// ver comentario en tripStatusMachine.ts). Se usa para recorrer varios
// pasos con una sola acción del chofer (ej. "Recogido" desde EN_CAMINO
// pasa antes por CERCA_DEL_DOMICILIO/LLEGANDO), igual que hace
// StartTripUseCase del lado de la web.
const HAPPY_PATH: readonly TripStatus[] = [
  TripStatus.SCHEDULED,
  TripStatus.CONFIRMATION_PENDING,
  TripStatus.CONFIRMED,
  TripStatus.DRIVER_ACCEPTED,
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
  TripStatus.ARRIVED_AT_DESTINATION,
  TripStatus.COMPLETED,
]

interface WhatsAppLocation {
  readonly latitude: number
  readonly longitude: number
}

interface WhatsAppButtonReply {
  readonly id: string
  readonly title: string
}

interface WhatsAppMessage {
  readonly id: string
  readonly from: string
  readonly type: string
  readonly text?: { readonly body: string }
  readonly location?: WhatsAppLocation
  readonly interactive?: {
    readonly type: string
    readonly button_reply?: WhatsAppButtonReply
  }
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

interface TripSnapshot {
  readonly id: string
  readonly status: TripStatus
  readonly passengerId: string
  readonly driverId: string
}

function tripSnapshotFromDoc(id: string, data: FirebaseFirestore.DocumentData): TripSnapshot {
  return {
    id,
    status: data.status as TripStatus,
    passengerId: data.passengerId as string,
    driverId: data.driverId as string,
  }
}

async function findActiveOrNextTripForDriver(driverId: string): Promise<TripSnapshot | null> {
  const snapshot = await getFirestore()
    .collection('trips')
    .where('driverId', '==', driverId)
    .where('status', 'in', NON_TERMINAL_STATUSES)
    .orderBy('scheduledDeparture', 'asc')
    .limit(1)
    .get()
  const doc = snapshot.docs[0]
  return doc ? tripSnapshotFromDoc(doc.id, doc.data()) : null
}

async function getTrip(tripId: string): Promise<TripSnapshot | null> {
  const doc = await getFirestore().collection('trips').doc(tripId).get()
  const data = doc.data()
  return data ? tripSnapshotFromDoc(doc.id, data) : null
}

async function getPassengerFirstName(passengerId: string): Promise<string> {
  const doc = await getFirestore().collection('passengers').doc(passengerId).get()
  const firstName = doc.data()?.firstName as string | undefined
  return firstName ?? 'el paciente'
}

async function appendTripEvent(
  tripId: string,
  event: {
    readonly type: string
    readonly description: string
    readonly actor: string
    readonly reason?: string
  },
): Promise<void> {
  await getFirestore()
    .collection('trips')
    .doc(tripId)
    .update({
      events: FieldValue.arrayUnion({
        id: `event-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
        tripId,
        timestamp: new Date().toISOString(),
        ...event,
      }),
    })
}

// Espejo de UpdateTripStatusUseCase (src/application/useCases): valida la
// transición contra la misma tabla y deja el mismo tipo de evento de
// auditoría. No dispara notificaciones al familiar acá — eso lo hace el
// trigger de Firestore en index.ts cuando se crea un documento en
// `notifications`, y este webhook no escribe ahí directamente (ver
// comentario en index.ts).
async function updateTripStatus(
  trip: TripSnapshot,
  nextStatus: TripStatus,
  actor: string,
  reason?: string,
): Promise<boolean> {
  if (!canTransition(trip.status, nextStatus)) {
    logger.warn('Transición de estado rechazada (WhatsApp)', {
      tripId: trip.id,
      from: trip.status,
      to: nextStatus,
    })
    return false
  }
  await getFirestore().collection('trips').doc(trip.id).update({ status: nextStatus })
  await appendTripEvent(trip.id, {
    type: eventTypeForStatus(nextStatus),
    description: reason
      ? `Traslado actualizado a "${nextStatus}" por WhatsApp. Motivo: ${reason}`
      : `Traslado actualizado a "${nextStatus}" por WhatsApp.`,
    actor,
    reason,
  })
  return true
}

// Recorre el camino feliz desde el estado actual hasta targetStatus,
// aplicando cada paso intermedio (mismo criterio que StartTripUseCase del
// lado de la web — ver comentario ahí): el chofer no tapea un botón por
// cada micro-estado (cerca del domicilio, llegando, etc.), esos quedan
// igual auditados como eventos propios con su propio timestamp.
async function advanceAlongHappyPath(
  trip: TripSnapshot,
  targetStatus: TripStatus,
  actor: string,
): Promise<TripSnapshot> {
  const currentIndex = HAPPY_PATH.indexOf(trip.status)
  const targetIndex = HAPPY_PATH.indexOf(targetStatus)
  if (currentIndex === -1 || targetIndex === -1 || targetIndex <= currentIndex) {
    return trip
  }

  let current = trip
  for (const status of HAPPY_PATH.slice(currentIndex + 1, targetIndex + 1)) {
    const applied = await updateTripStatus(current, status, actor)
    if (!applied) break
    current = { ...current, status }
  }
  return current
}

function buttonsForDriverTrip(trip: TripSnapshot): {
  readonly text: string
  readonly buttons: readonly WhatsAppButton[]
} {
  if (
    trip.status === TripStatus.SCHEDULED ||
    trip.status === TripStatus.CONFIRMATION_PENDING ||
    trip.status === TripStatus.CONFIRMED ||
    trip.status === TripStatus.DRIVER_ACCEPTED
  ) {
    return {
      text: 'Tenés un viaje esperando. ¿Qué querés hacer?',
      buttons: [
        { id: `ADVANCE_ON_THE_WAY:${trip.id}`, title: 'Iniciar viaje' },
        { id: `REPORT_PROBLEM:${trip.id}`, title: 'Problema' },
        { id: `REPORT_EMERGENCY:${trip.id}`, title: 'Emergencia' },
      ],
    }
  }
  if (
    trip.status === TripStatus.ON_THE_WAY ||
    trip.status === TripStatus.NEAR_HOME ||
    trip.status === TripStatus.ARRIVING
  ) {
    return {
      text: 'Viaje en curso hacia el domicilio. ¿Qué querés hacer?',
      buttons: [
        { id: `ADVANCE_PICKED_UP:${trip.id}`, title: 'Recogido' },
        { id: `REPORT_PROBLEM:${trip.id}`, title: 'Problema' },
        { id: `REPORT_EMERGENCY:${trip.id}`, title: 'Emergencia' },
      ],
    }
  }
  return {
    text: 'Viaje en curso hacia el destino. ¿Qué querés hacer?',
    buttons: [
      { id: `ADVANCE_COMPLETED:${trip.id}`, title: 'Entregado' },
      { id: `REPORT_PROBLEM:${trip.id}`, title: 'Problema' },
      { id: `REPORT_EMERGENCY:${trip.id}`, title: 'Emergencia' },
    ],
  }
}

async function handleDriverMessage(driverId: string, message: WhatsAppMessage): Promise<void> {
  if (message.type === 'location' && message.location) {
    const trip = await findActiveOrNextTripForDriver(driverId)
    if (!trip) {
      logger.warn('El chofer no tiene un traslado activo en este momento', { driverId })
      return
    }
    await getFirestore()
      .collection('trips')
      .doc(trip.id)
      .update({
        currentLocation: {
          latitude: message.location.latitude,
          longitude: message.location.longitude,
        },
      })
    logger.info('Ubicación actualizada desde WhatsApp', { tripId: trip.id, driverId })
    return
  }

  const buttonId = message.interactive?.button_reply?.id
  if (buttonId) {
    const [action, tripId] = buttonId.split(':')
    if (!tripId) return
    const trip = await getTrip(tripId)
    if (!trip || trip.driverId !== driverId) return

    if (action === 'ADVANCE_ON_THE_WAY') {
      await advanceAlongHappyPath(trip, TripStatus.ON_THE_WAY, `Chofer (${driverId})`)
      await sendWhatsAppText(message.from, 'Listo, viaje iniciado.')
      return
    }
    if (action === 'ADVANCE_PICKED_UP') {
      await advanceAlongHappyPath(trip, TripStatus.PICKED_UP, `Chofer (${driverId})`)
      await sendWhatsAppText(message.from, 'Listo, registrado como recogido.')
      return
    }
    if (action === 'ADVANCE_COMPLETED') {
      await advanceAlongHappyPath(trip, TripStatus.ARRIVED_AT_DESTINATION, `Chofer (${driverId})`)
      const updated = await getTrip(tripId)
      if (updated) await updateTripStatus(updated, TripStatus.COMPLETED, `Chofer (${driverId})`)
      await sendWhatsAppText(message.from, 'Listo, viaje finalizado.')
      return
    }
    if (action === 'REPORT_PROBLEM' || action === 'REPORT_EMERGENCY') {
      await getFirestore()
        .collection('incidents')
        .add({
          tripId,
          type: action === 'REPORT_EMERGENCY' ? 'EMERGENCIA' : 'OTRO',
          description:
            action === 'REPORT_EMERGENCY'
              ? 'Emergencia reportada por WhatsApp.'
              : 'Problema reportado por WhatsApp (sin detalle adicional).',
          timestamp: new Date().toISOString(),
          estimatedDelayMinutes: 15,
          reportedBy: `Chofer (${driverId})`,
        })
      await updateTripStatus(trip, TripStatus.INCIDENT, `Chofer (${driverId})`)
      await sendWhatsAppText(
        message.from,
        action === 'REPORT_EMERGENCY'
          ? 'Emergencia registrada. Un coordinador te va a contactar.'
          : 'Problema registrado. Avisamos al coordinador.',
      )
      return
    }
    return
  }

  // Cualquier otro mensaje (texto libre, o un tipo sin manejador todavía):
  // se responde con el estado del viaje relevante y los botones que
  // correspondan, en vez de intentar interpretar lenguaje natural (rule del
  // diseño original).
  const trip = await findActiveOrNextTripForDriver(driverId)
  if (!trip) {
    await sendWhatsAppText(message.from, 'No tenés ningún viaje activo en este momento.')
    return
  }
  const { text, buttons } = buttonsForDriverTrip(trip)
  await sendWhatsAppButtons(message.from, text, buttons)
}

async function handleGuardianMessage(
  guardian: { readonly id: string; readonly fullName: string; readonly relationship: string },
  message: WhatsAppMessage,
): Promise<void> {
  const buttonId = message.interactive?.button_reply?.id
  if (buttonId) {
    const [action, tripId] = buttonId.split(':')
    if (!tripId) return
    const trip = await getTrip(tripId)
    if (!trip) return

    if (action === 'CONFIRM_TRIP') {
      const applied = await updateTripStatus(
        trip,
        TripStatus.CONFIRMED,
        `${guardian.fullName} (${guardian.relationship})`,
      )
      await sendWhatsAppText(
        message.from,
        applied
          ? 'Gracias, viaje confirmado.'
          : 'Ese viaje ya no está esperando confirmación — puede que ya haya cambiado de estado.',
      )
      return
    }
    if (action === 'CANCEL_TRIP') {
      await setAwaitingCancellationReason(message.from, {
        tripId,
        guardianFullName: guardian.fullName,
        relationship: guardian.relationship,
      })
      await sendWhatsAppText(message.from, '¿Por qué motivo cancelás el viaje? Contanos en un mensaje.')
      return
    }
    return
  }

  const pendingCancellation = await consumeAwaitingCancellationReason(message.from)
  if (pendingCancellation && message.type === 'text' && message.text?.body.trim()) {
    const trip = await getTrip(pendingCancellation.tripId)
    if (!trip) return
    const applied = await updateTripStatus(
      trip,
      TripStatus.CANCELLED,
      `${pendingCancellation.guardianFullName} (${pendingCancellation.relationship})`,
      message.text.body.trim(),
    )
    const passengerFirstName = await getPassengerFirstName(trip.passengerId)
    await sendWhatsAppText(
      message.from,
      applied
        ? `Listo, cancelamos el viaje de ${passengerFirstName}.`
        : 'No pudimos cancelar ese viaje — puede que ya haya cambiado de estado. Contactá a un coordinador.',
    )
    return
  }

  logger.info('Mensaje de familiar sin manejador todavía (ver docs/whatsapp-bot.md)', {
    guardianId: guardian.id,
    type: message.type,
  })
}

// Procesa los mensajes entrantes del webhook de WhatsApp Business API.
//
// Implementado: identificación de chofer/familiar, idempotencia por id de
// mensaje, ubicación del chofer, botones de estado del chofer (iniciar/
// recogido/entregado/problema/emergencia) y confirmación/cancelación del
// familiar (con motivo obligatorio para cancelar).
//
// Todavía NO implementado (ver docs/whatsapp-bot.md): avance de estado por
// proximidad real de GPS (cerca del domicilio/destino — hoy esos pasos
// intermedios se saltean de una sola vez al tocar "Iniciar"/"Recogido"/
// "Entregado", en vez de detectarse solos como en TripSimulationEngine), la
// lista de tipos de incidente con descripción propia (hoy es un botón único
// "Problema" con descripción genérica), y las consultas de los padres
// ("¿dónde está mi hijo?").
export async function processWhatsAppWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
  const messages = extractMessages(payload)

  for (const message of messages) {
    const isNewMessage = await tryMarkMessageAsProcessed(message.id)
    if (!isNewMessage) {
      logger.info('Mensaje de WhatsApp repetido, se ignora (idempotencia)', { id: message.id })
      continue
    }

    const sender = await identifySender(message.from)
    if (!sender) {
      logger.warn('Mensaje de WhatsApp de un número no reconocido', { from: message.from })
      continue
    }

    try {
      if (sender.type === 'driver') {
        await handleDriverMessage(sender.id, message)
      } else {
        await handleGuardianMessage(sender, message)
      }
    } catch (error) {
      logger.error('Error procesando un mensaje de WhatsApp', { error, from: message.from })
    }
  }
}
