import type { GeoCoordinates } from '@/domain/valueObjects/Address'

export const TripEventType = {
  SCHEDULED: 'PROGRAMADO',
  DRIVER_STARTED: 'CHOFER_INICIO_RECORRIDO',
  NEAR_HOME: 'VEHICULO_CERCA_DEL_DOMICILIO',
  GUARDIAN_NOTIFIED: 'PADRE_NOTIFICADO',
  PICKED_UP: 'NINO_RECOGIDO',
  IN_TRANSIT: 'TRASLADO_INICIADO',
  NEAR_DESTINATION: 'VEHICULO_CERCA_DEL_DESTINO',
  DELIVERED: 'NINO_ENTREGADO',
  DELAYED: 'DEMORA_REGISTRADA',
  INCIDENT: 'INCIDENTE_REGISTRADO',
  CANCELLED: 'TRASLADO_CANCELADO',
} as const

export type TripEventType = (typeof TripEventType)[keyof typeof TripEventType]

// Registro de auditoría de un traslado (rule 49): permite reconstruir todo
// el recorrido después, incluso si el estado actual cambió muchas veces.
export interface TripEvent {
  readonly id: string
  readonly tripId: string
  readonly type: TripEventType
  readonly timestamp: string
  readonly location?: GeoCoordinates
  readonly description: string
  readonly actor: string
}
