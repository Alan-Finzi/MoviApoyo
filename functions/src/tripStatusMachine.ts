// Espejo minimalista de src/domain/services/TripStatusMachine.ts — este
// proyecto de Cloud Functions compila por separado del frontend (ver
// README de esta carpeta), así que no puede importarlo directamente. Solo
// se duplica lo que este webhook necesita: validar que una transición
// disparada por WhatsApp sea válida antes de escribirla, igual que hace
// UpdateTripStatusUseCase del lado de la web. Si TripStatusMachine cambia,
// hay que actualizar esto a mano.
export const TripStatus = {
  SCHEDULED: 'PROGRAMADO',
  CONFIRMATION_PENDING: 'CONFIRMACION_PENDIENTE',
  CONFIRMED: 'CONFIRMADO',
  DRIVER_ACCEPTED: 'CHOFER_ACEPTO',
  ON_THE_WAY: 'EN_CAMINO_AL_DOMICILIO',
  NEAR_HOME: 'CERCA_DEL_DOMICILIO',
  ARRIVING: 'LLEGANDO',
  PICKED_UP: 'NIÑO_RECOGIDO',
  IN_TRANSIT: 'EN_TRASLADO',
  NEAR_DESTINATION: 'CERCA_DEL_DESTINO',
  ARRIVED_AT_DESTINATION: 'LLEGADA_A_DESTINO',
  COMPLETED: 'FINALIZADO',
  DELAYED: 'DEMORADO',
  CANCELLED: 'CANCELADO',
  INCIDENT: 'INCIDENTE',
  NO_SHOW: 'PACIENTE_AUSENTE',
  RESCHEDULED: 'REPROGRAMADO',
  NOT_COMPLETED: 'NO_REALIZADO',
} as const

export type TripStatus = (typeof TripStatus)[keyof typeof TripStatus]

const ALLOWED_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  [TripStatus.SCHEDULED]: [
    TripStatus.CONFIRMATION_PENDING,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.CONFIRMATION_PENDING]: [
    TripStatus.CONFIRMED,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.CONFIRMED]: [TripStatus.DRIVER_ACCEPTED, TripStatus.CANCELLED, TripStatus.RESCHEDULED],
  [TripStatus.DRIVER_ACCEPTED]: [
    TripStatus.ON_THE_WAY,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.ON_THE_WAY]: [
    TripStatus.NEAR_HOME,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
    TripStatus.CANCELLED,
  ],
  [TripStatus.NEAR_HOME]: [TripStatus.ARRIVING, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.ARRIVING]: [
    TripStatus.PICKED_UP,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
    TripStatus.NO_SHOW,
  ],
  [TripStatus.PICKED_UP]: [TripStatus.IN_TRANSIT],
  [TripStatus.IN_TRANSIT]: [TripStatus.NEAR_DESTINATION, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.NEAR_DESTINATION]: [
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
  ],
  [TripStatus.ARRIVED_AT_DESTINATION]: [
    TripStatus.COMPLETED,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
  ],
  [TripStatus.COMPLETED]: [],
  [TripStatus.DELAYED]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.CANCELLED,
    TripStatus.NOT_COMPLETED,
  ],
  [TripStatus.INCIDENT]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.CANCELLED,
    TripStatus.NOT_COMPLETED,
  ],
  [TripStatus.CANCELLED]: [],
  [TripStatus.NO_SHOW]: [],
  [TripStatus.RESCHEDULED]: [],
  [TripStatus.NOT_COMPLETED]: [],
}

export function canTransition(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false
}

// Espejo de STATUS_TO_EVENT_TYPE en
// src/domain/services/TripNotificationRules.ts — el campo `type` de un
// TripEvent usa estos valores, no el propio TripStatus (son dos enums
// distintos del lado de la web). Sin este mapeo, los eventos generados
// desde WhatsApp quedarían con un `type` que la web nunca produce.
const STATUS_TO_EVENT_TYPE: Record<TripStatus, string> = {
  [TripStatus.SCHEDULED]: 'PROGRAMADO',
  [TripStatus.CONFIRMATION_PENDING]: 'CONFIRMACION_SOLICITADA',
  [TripStatus.CONFIRMED]: 'VIAJE_CONFIRMADO',
  [TripStatus.DRIVER_ACCEPTED]: 'CHOFER_ACEPTO_VIAJE',
  [TripStatus.ON_THE_WAY]: 'CHOFER_INICIO_RECORRIDO',
  [TripStatus.NEAR_HOME]: 'VEHICULO_CERCA_DEL_DOMICILIO',
  [TripStatus.ARRIVING]: 'VEHICULO_CERCA_DEL_DOMICILIO',
  [TripStatus.PICKED_UP]: 'NINO_RECOGIDO',
  [TripStatus.IN_TRANSIT]: 'TRASLADO_INICIADO',
  [TripStatus.NEAR_DESTINATION]: 'VEHICULO_CERCA_DEL_DESTINO',
  [TripStatus.ARRIVED_AT_DESTINATION]: 'LLEGADA_A_DESTINO',
  [TripStatus.COMPLETED]: 'NINO_ENTREGADO',
  [TripStatus.DELAYED]: 'DEMORA_REGISTRADA',
  [TripStatus.INCIDENT]: 'INCIDENTE_REGISTRADO',
  [TripStatus.CANCELLED]: 'TRASLADO_CANCELADO',
  [TripStatus.NO_SHOW]: 'PACIENTE_AUSENTE_REGISTRADO',
  [TripStatus.RESCHEDULED]: 'TRASLADO_REPROGRAMADO',
  [TripStatus.NOT_COMPLETED]: 'TRASLADO_NO_REALIZADO',
}

export function eventTypeForStatus(status: TripStatus): string {
  return STATUS_TO_EVENT_TYPE[status]
}
