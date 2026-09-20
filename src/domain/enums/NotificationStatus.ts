export const NotificationStatus = {
  PENDING: 'PENDIENTE',
  SENT: 'ENVIADA',
  DELIVERED: 'ENTREGADA',
  FAILED: 'FALLIDA',
} as const

export type NotificationStatus = (typeof NotificationStatus)[keyof typeof NotificationStatus]
