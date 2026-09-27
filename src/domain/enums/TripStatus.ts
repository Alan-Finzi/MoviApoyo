// Se usa un objeto "as const" en lugar de un `enum` de TypeScript porque el
// proyecto compila con "erasableSyntaxOnly" (los enums generan código en
// tiempo de ejecución y no son 100% erasable). El patrón object + union type
// da el mismo resultado (autocompletado, valores centralizados) sin ese costo.
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
