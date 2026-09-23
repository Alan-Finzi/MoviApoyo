import { IncidentType } from '@/domain/enums/IncidentType'
import { NotificationStatus } from '@/domain/enums/NotificationStatus'
import { NotificationType } from '@/domain/enums/NotificationType'

import type { StatusTone } from './trip.constants'

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  [NotificationType.VEHICLE_APPROACHING]: 'Vehículo acercándose',
  [NotificationType.DELAY]: 'Demora',
  [NotificationType.INCIDENT]: 'Incidente',
  [NotificationType.CHILD_PICKED_UP]: 'Paciente recogido',
  [NotificationType.CHILD_DELIVERED]: 'Paciente entregado',
}

// Colores del centro de notificaciones (rule 14): 🟢🟡🔴🔵🟣.
export const NOTIFICATION_TYPE_TONE: Record<NotificationType, StatusTone> = {
  [NotificationType.VEHICLE_APPROACHING]: 'success',
  [NotificationType.DELAY]: 'warning',
  [NotificationType.INCIDENT]: 'danger',
  [NotificationType.CHILD_PICKED_UP]: 'info',
  [NotificationType.CHILD_DELIVERED]: 'info',
}

export const NOTIFICATION_STATUS_LABELS: Record<NotificationStatus, string> = {
  [NotificationStatus.PENDING]: 'Pendiente',
  [NotificationStatus.SENT]: 'Enviada',
  [NotificationStatus.DELIVERED]: 'Entregada',
  [NotificationStatus.FAILED]: 'Fallida',
}

export const NOTIFICATION_STATUS_TONE: Record<NotificationStatus, StatusTone> = {
  [NotificationStatus.PENDING]: 'neutral',
  [NotificationStatus.SENT]: 'info',
  [NotificationStatus.DELIVERED]: 'success',
  [NotificationStatus.FAILED]: 'danger',
}

export const INCIDENT_TYPE_LABELS: Record<IncidentType, string> = {
  [IncidentType.TRAFFIC]: 'Tránsito',
  [IncidentType.MECHANICAL_FAILURE]: 'Falla mecánica',
  [IncidentType.FLAT_TIRE]: 'Pinchadura',
  [IncidentType.REFUELING]: 'Carga de combustible',
  [IncidentType.ROAD_CLOSURE]: 'Corte de calle',
  [IncidentType.ACCIDENT]: 'Accidente de tránsito',
  [IncidentType.WEATHER]: 'Problema climático',
  [IncidentType.DRIVER_DELAY]: 'Demora del chofer',
  [IncidentType.OTHER]: 'Otro',
}
