import type { GeoCoordinates } from '@/domain/valueObjects/Address'

export const TripEventType = {
  SCHEDULED: 'PROGRAMADO',
  CONFIRMATION_REQUESTED: 'CONFIRMACION_SOLICITADA',
  CONFIRMED: 'VIAJE_CONFIRMADO',
  DRIVER_ACCEPTED: 'CHOFER_ACEPTO_VIAJE',
  DRIVER_STARTED: 'CHOFER_INICIO_RECORRIDO',
  NEAR_HOME: 'VEHICULO_CERCA_DEL_DOMICILIO',
  GUARDIAN_NOTIFIED: 'PADRE_NOTIFICADO',
  PICKED_UP: 'NINO_RECOGIDO',
  IN_TRANSIT: 'TRASLADO_INICIADO',
  NEAR_DESTINATION: 'VEHICULO_CERCA_DEL_DESTINO',
  ARRIVED_AT_DESTINATION: 'LLEGADA_A_DESTINO',
  DELIVERED: 'NINO_ENTREGADO',
  DELAYED: 'DEMORA_REGISTRADA',
  INCIDENT: 'INCIDENTE_REGISTRADO',
  CANCELLED: 'TRASLADO_CANCELADO',
  NO_SHOW: 'PACIENTE_AUSENTE_REGISTRADO',
  RESCHEDULED: 'TRASLADO_REPROGRAMADO',
  NOT_COMPLETED: 'TRASLADO_NO_REALIZADO',
  DRIVER_REASSIGNED: 'CHOFER_REASIGNADO',
  VEHICLE_REASSIGNED: 'VEHICULO_REASIGNADO',
  ASSIGNMENT_OVERRIDE: 'ASIGNACION_FORZADA',
} as const

export type TripEventType = (typeof TripEventType)[keyof typeof TripEventType]

// Registro de auditoría de un traslado (rule 49): permite reconstruir todo
// el recorrido después, incluso si el estado actual cambió muchas veces.
// previousValue/newValue son para eventos de cambio (ej.
// DRIVER_REASSIGNED/VEHICLE_REASSIGNED, ver ReassignTripUseCase): permiten
// mostrar "Carlos → Pedro" en el detalle del viaje sin parsear `description`.
export interface TripEvent {
  readonly id: string
  readonly tripId: string
  readonly type: TripEventType
  readonly timestamp: string
  readonly location?: GeoCoordinates
  readonly description: string
  readonly actor: string
  readonly previousValue?: string
  readonly newValue?: string
  readonly reason?: string
}
