import {
  consumeAwaitingCancellationReason,
  setAwaitingCancellationReason,
} from './conversationState'
import { tryMarkMessageAsProcessed } from './dedupe'
import {
  and,
  appendToArray,
  createDocument,
  fieldEquals,
  fieldIn,
  getDocument,
  patchDocument,
  runQuery,
} from './firestoreRest'
import { identifySender } from './identity'
import { getGuardianNotificationMessage, getGuardianNotificationType } from './tripNotificationRules'
import { canTransition, eventTypeForStatus, TripStatus } from './tripStatusMachine'
import type { Env } from './types'
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

function tripSnapshotFromDoc(id: string, data: Record<string, unknown>): TripSnapshot {
  return {
    id,
    status: data.status as TripStatus,
    passengerId: data.passengerId as string,
    driverId: data.driverId as string,
  }
}

async function findActiveOrNextTripForDriver(env: Env, driverId: string): Promise<TripSnapshot | null> {
  const docs = await runQuery(env, {
    from: [{ collectionId: 'trips' }],
    where: and(fieldEquals('driverId', driverId), fieldIn('status', NON_TERMINAL_STATUSES)),
    orderBy: [{ field: { fieldPath: 'scheduledDeparture' }, direction: 'ASCENDING' }],
    limit: 1,
  })
  const doc = docs[0]
  return doc ? tripSnapshotFromDoc(doc.id, doc.data) : null
}

async function getTrip(env: Env, tripId: string): Promise<TripSnapshot | null> {
  const doc = await getDocument(env, `trips/${tripId}`)
  return doc ? tripSnapshotFromDoc(doc.id, doc.data) : null
}

interface PassengerSnapshot {
  readonly firstName: string
  readonly guardianId: string | null
}

async function getPassenger(env: Env, passengerId: string): Promise<PassengerSnapshot> {
  const doc = await getDocument(env, `passengers/${passengerId}`)
  return {
    firstName: (doc?.data.firstName as string | undefined) ?? 'el paciente',
    guardianId: (doc?.data.guardianId as string | undefined) ?? null,
  }
}

async function appendTripEvent(
  env: Env,
  tripId: string,
  event: {
    readonly type: string
    readonly description: string
    readonly actor: string
    readonly reason?: string
  },
): Promise<void> {
  await appendToArray(env, `trips/${tripId}`, 'events', {
    id: `event-${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`,
    tripId,
    timestamp: new Date().toISOString(),
    ...event,
  })
}

// Espejo de UpdateTripStatusUseCase (src/application/useCases): valida la
// transición contra la misma tabla, deja el mismo tipo de evento de
// auditoría y, si el estado lo amerita (ver tripNotificationRules.ts),
// escribe en `notifications` — igual que hace UpdateTripStatusUseCase del
// lado de la web. `whatsappSentAt: null` es la marca que después busca
// sendPendingNotifications.ts (el cron) para saber que todavía no se
// mandó — sin esto, la consulta `== null` de Firestore no encontraría nada
// (un campo ausente no matchea, tiene que estar presente y en null).
async function updateTripStatus(
  env: Env,
  trip: TripSnapshot,
  nextStatus: TripStatus,
  actor: string,
  reason?: string,
): Promise<boolean> {
  if (!canTransition(trip.status, nextStatus)) {
    console.warn('Transición de estado rechazada (WhatsApp)', { tripId: trip.id, from: trip.status, to: nextStatus })
    return false
  }
  await patchDocument(env, `trips/${trip.id}`, { status: nextStatus })
  await appendTripEvent(env, trip.id, {
    type: eventTypeForStatus(nextStatus),
    description: reason
      ? `Traslado actualizado a "${nextStatus}" por WhatsApp. Motivo: ${reason}`
      : `Traslado actualizado a "${nextStatus}" por WhatsApp.`,
    actor,
    reason,
  })

  const passenger = await getPassenger(env, trip.passengerId)
  const message = getGuardianNotificationMessage(nextStatus, passenger.firstName)
  if (message && passenger.guardianId) {
    await createDocument(env, 'notifications', {
      tripId: trip.id,
      guardianId: passenger.guardianId,
      type: getGuardianNotificationType(nextStatus),
      channel: 'WHATSAPP',
      message,
      status: 'ENVIADA',
      whatsappSentAt: null,
      createdAt: new Date().toISOString(),
    })
  }

  return true
}

// Recorre el camino feliz desde el estado actual hasta targetStatus,
// aplicando cada paso intermedio (mismo criterio que StartTripUseCase del
// lado de la web — ver comentario ahí): el chofer no tapea un botón por
// cada micro-estado (cerca del domicilio, llegando, etc.), esos quedan
// igual auditados como eventos propios con su propio timestamp.
async function advanceAlongHappyPath(
  env: Env,
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
    const applied = await updateTripStatus(env, current, status, actor)
    if (!applied) break
    current = { ...current, status }
  }
  return current
}

// Pregunta "¿Retiraste a X?" (ver handleDriverMessage, acción ARRIVED_YES) —
// aparte para poder mandarla también apenas el chofer confirma que llegó,
// no solo cuando escribe de nuevo.
function pickupQuestionButtons(
  trip: TripSnapshot,
  childFirstName: string,
): { readonly text: string; readonly buttons: readonly WhatsAppButton[] } {
  return {
    text: `¿Retiraste a ${childFirstName}?`,
    buttons: [
      { id: `PICKUP_YES:${trip.id}`, title: 'Sí, lo retiré' },
      { id: `PICKUP_NO:${trip.id}`, title: 'No salió' },
    ],
  }
}

async function buttonsForDriverTrip(
  env: Env,
  trip: TripSnapshot,
): Promise<{ readonly text: string; readonly buttons: readonly WhatsAppButton[] }> {
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
  if (trip.status === TripStatus.ON_THE_WAY || trip.status === TripStatus.NEAR_HOME) {
    // Antes esto era un único botón "Recogido" que saltaba directo a
    // recogido. Ahora se confirma en dos pasos explícitos (rule pedida:
    // "que responda llegaste SI o NO, retiraste al paciente SI o NO") — ver
    // ARRIVED_YES/ARRIVED_NO/PICKUP_YES/PICKUP_NO en handleDriverMessage.
    const passenger = await getPassenger(env, trip.passengerId)
    return {
      text: `¿Llegaste al domicilio de ${passenger.firstName}?`,
      buttons: [
        { id: `ARRIVED_YES:${trip.id}`, title: 'Sí' },
        { id: `ARRIVED_NO:${trip.id}`, title: 'No, todavía' },
        { id: `REPORT_PROBLEM:${trip.id}`, title: 'Problema' },
      ],
    }
  }
  if (trip.status === TripStatus.ARRIVING) {
    // Ya confirmó que llegó — lo único que falta es la segunda pregunta.
    const passenger = await getPassenger(env, trip.passengerId)
    return pickupQuestionButtons(trip, passenger.firstName)
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

async function handleDriverMessage(env: Env, driverId: string, message: WhatsAppMessage): Promise<void> {
  if (message.type === 'location' && message.location) {
    const trip = await findActiveOrNextTripForDriver(env, driverId)
    if (!trip) {
      console.warn('El chofer no tiene un traslado activo en este momento', { driverId })
      return
    }
    await patchDocument(env, `trips/${trip.id}`, {
      currentLocation: { latitude: message.location.latitude, longitude: message.location.longitude },
    })
    console.log('Ubicación actualizada desde WhatsApp', { tripId: trip.id, driverId })
    return
  }

  const buttonId = message.interactive?.button_reply?.id
  if (buttonId) {
    const [action, tripId] = buttonId.split(':')
    if (!tripId) return
    const trip = await getTrip(env, tripId)
    if (!trip || trip.driverId !== driverId) return

    if (action === 'ADVANCE_ON_THE_WAY') {
      await advanceAlongHappyPath(env, trip, TripStatus.ON_THE_WAY, `Chofer (${driverId})`)
      await sendWhatsAppText(env, message.from, 'Listo, viaje iniciado.')
      return
    }
    if (action === 'ARRIVED_YES') {
      const updated = await advanceAlongHappyPath(env, trip, TripStatus.ARRIVING, `Chofer (${driverId})`)
      const passenger = await getPassenger(env, updated.passengerId)
      const { text, buttons } = pickupQuestionButtons(updated, passenger.firstName)
      await sendWhatsAppButtons(env, message.from, text, buttons)
      return
    }
    if (action === 'ARRIVED_NO') {
      await sendWhatsAppText(env, message.from, 'Dale, avisame apenas llegues.')
      return
    }
    if (action === 'PICKUP_YES') {
      await advanceAlongHappyPath(env, trip, TripStatus.PICKED_UP, `Chofer (${driverId})`)
      await sendWhatsAppText(env, message.from, 'Listo, registrado como recogido.')
      return
    }
    if (action === 'PICKUP_NO') {
      await updateTripStatus(env, trip, TripStatus.NO_SHOW, `Chofer (${driverId})`)
      await sendWhatsAppText(
        env,
        message.from,
        'Entendido, registramos que el paciente no salió. Avisamos al familiar y a un coordinador.',
      )
      return
    }
    if (action === 'ADVANCE_COMPLETED') {
      await advanceAlongHappyPath(env, trip, TripStatus.ARRIVED_AT_DESTINATION, `Chofer (${driverId})`)
      const updated = await getTrip(env, tripId)
      if (updated) await updateTripStatus(env, updated, TripStatus.COMPLETED, `Chofer (${driverId})`)
      await sendWhatsAppText(env, message.from, 'Listo, viaje finalizado.')
      return
    }
    if (action === 'REPORT_PROBLEM' || action === 'REPORT_EMERGENCY') {
      await createDocument(env, 'incidents', {
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
      await updateTripStatus(env, trip, TripStatus.INCIDENT, `Chofer (${driverId})`)
      await sendWhatsAppText(
        env,
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
  const trip = await findActiveOrNextTripForDriver(env, driverId)
  if (!trip) {
    await sendWhatsAppText(env, message.from, 'No tenés ningún viaje activo en este momento.')
    return
  }
  const { text, buttons } = await buttonsForDriverTrip(env, trip)
  await sendWhatsAppButtons(env, message.from, text, buttons)
}

async function handleGuardianMessage(
  env: Env,
  guardian: { readonly id: string; readonly fullName: string; readonly relationship: string },
  message: WhatsAppMessage,
): Promise<void> {
  const buttonId = message.interactive?.button_reply?.id
  if (buttonId) {
    const [action, tripId] = buttonId.split(':')
    if (!tripId) return
    const trip = await getTrip(env, tripId)
    if (!trip) return

    if (action === 'CONFIRM_TRIP') {
      const applied = await updateTripStatus(
        env,
        trip,
        TripStatus.CONFIRMED,
        `${guardian.fullName} (${guardian.relationship})`,
      )
      await sendWhatsAppText(
        env,
        message.from,
        applied
          ? 'Gracias, viaje confirmado.'
          : 'Ese viaje ya no está esperando confirmación — puede que ya haya cambiado de estado.',
      )
      return
    }
    if (action === 'CANCEL_TRIP') {
      await setAwaitingCancellationReason(env, message.from, {
        tripId,
        guardianFullName: guardian.fullName,
        relationship: guardian.relationship,
      })
      await sendWhatsAppText(env, message.from, '¿Por qué motivo cancelás el viaje? Contanos en un mensaje.')
      return
    }
    return
  }

  const pendingCancellation = await consumeAwaitingCancellationReason(env, message.from)
  if (pendingCancellation && message.type === 'text' && message.text?.body.trim()) {
    const trip = await getTrip(env, pendingCancellation.tripId)
    if (!trip) return
    const applied = await updateTripStatus(
      env,
      trip,
      TripStatus.CANCELLED,
      `${pendingCancellation.guardianFullName} (${pendingCancellation.relationship})`,
      message.text.body.trim(),
    )
    const passengerFirstName = (await getPassenger(env, trip.passengerId)).firstName
    await sendWhatsAppText(
      env,
      message.from,
      applied
        ? `Listo, cancelamos el viaje de ${passengerFirstName}.`
        : 'No pudimos cancelar ese viaje — puede que ya haya cambiado de estado. Contactá a un coordinador.',
    )
    return
  }

  console.log('Mensaje de familiar sin manejador todavía (ver docs/whatsapp-bot.md)', {
    guardianId: guardian.id,
    type: message.type,
  })
}

// Procesa los mensajes entrantes del webhook de WhatsApp Business API.
//
// Implementado: identificación de chofer/familiar, idempotencia por id de
// mensaje, ubicación del chofer, botones de estado del chofer (iniciar/
// llegué+retiré en dos preguntas Sí-No/entregado/problema/emergencia),
// confirmación/cancelación del familiar (con motivo obligatorio para
// cancelar) y aviso al familiar por WhatsApp en los mismos hitos que ya
// notifica la web (cerca del domicilio, recogido, en camino, entregado,
// paciente ausente — ver tripNotificationRules.ts). Los avisos salientes
// (acá y desde la web) los termina mandando sendPendingNotifications.ts,
// que corre por cron cada un minuto — ver index.ts.
//
// Todavía NO implementado (ver docs/whatsapp-bot.md): avance de estado por
// proximidad real de GPS (cerca del domicilio/destino — hoy esos pasos
// intermedios se saltean de una sola vez al tocar "Iniciar"/"Sí, llegué", en
// vez de detectarse solos como en TripSimulationEngine), la lista de tipos
// de incidente con descripción propia (hoy es un botón único "Problema" con
// descripción genérica), las consultas de los padres ("¿dónde está mi
// hijo?"), y validar la firma "X-Hub-Signature-256" del request (confirmar
// que el POST viene realmente de Meta) — importante antes de producción.
export async function processWhatsAppWebhook(env: Env, payload: WhatsAppWebhookPayload): Promise<void> {
  const messages = extractMessages(payload)

  for (const message of messages) {
    const isNewMessage = await tryMarkMessageAsProcessed(env, message.id)
    if (!isNewMessage) {
      console.log('Mensaje de WhatsApp repetido, se ignora (idempotencia)', { id: message.id })
      continue
    }

    const sender = await identifySender(env, message.from)
    if (!sender) {
      console.warn('Mensaje de WhatsApp de un número no reconocido', { from: message.from })
      continue
    }

    try {
      if (sender.type === 'driver') {
        await handleDriverMessage(env, sender.id, message)
      } else {
        await handleGuardianMessage(env, sender, message)
      }
    } catch (error) {
      console.error('Error procesando un mensaje de WhatsApp', { error, from: message.from })
    }
  }
}
