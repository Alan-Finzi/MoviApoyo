export const NotificationType = {
  VEHICLE_APPROACHING: 'VEHICULO_ACERCANDOSE',
  DELAY: 'DEMORA',
  INCIDENT: 'INCIDENTE',
  CHILD_PICKED_UP: 'NINO_RECOGIDO',
  CHILD_DELIVERED: 'NINO_ENTREGADO',
  CONFIRMATION_REQUESTED: 'CONFIRMACION_SOLICITADA',
} as const

export type NotificationType = (typeof NotificationType)[keyof typeof NotificationType]
