import { NotificationType } from '@/domain/enums/NotificationType'
import { TripStatus } from '@/domain/enums/TripStatus'
import { NOTIFICATION_MESSAGES } from '@/shared/constants/messages.constants'
import { formatTime } from '@/shared/utils/date'

import { TripEventType } from '../entities/TripEvent'

// Reglas puras que traducen "a qué estado pasó el traslado" en "qué evento
// de auditoría registrar" y "qué mensaje de WhatsApp mandar, si corresponde"
// (rule 2 y rule 48). Se apoyan en shared/constants y shared/utils, que son
// utilidades sin dependencias de framework, no en Infrastructure.
const STATUS_TO_EVENT_TYPE: Record<TripStatus, TripEventType> = {
  [TripStatus.SCHEDULED]: TripEventType.SCHEDULED,
  [TripStatus.ON_THE_WAY]: TripEventType.DRIVER_STARTED,
  [TripStatus.NEAR_HOME]: TripEventType.NEAR_HOME,
  [TripStatus.ARRIVING]: TripEventType.NEAR_HOME,
  [TripStatus.PICKED_UP]: TripEventType.PICKED_UP,
  [TripStatus.IN_TRANSIT]: TripEventType.IN_TRANSIT,
  [TripStatus.NEAR_DESTINATION]: TripEventType.NEAR_DESTINATION,
  [TripStatus.COMPLETED]: TripEventType.DELIVERED,
  [TripStatus.DELAYED]: TripEventType.DELAYED,
  [TripStatus.INCIDENT]: TripEventType.INCIDENT,
  [TripStatus.CANCELLED]: TripEventType.CANCELLED,
}

export function getEventTypeForStatus(status: TripStatus): TripEventType {
  return STATUS_TO_EVENT_TYPE[status]
}

// Devuelve el mensaje a enviar al padre/tutor cuando el traslado pasa a
// este estado, o null si ese cambio de estado no amerita notificación.
export function getNotificationMessageForStatus(
  status: TripStatus,
  childFirstName: string,
  estimatedArrivalIso: string,
): string | null {
  switch (status) {
    case TripStatus.ARRIVING:
      return NOTIFICATION_MESSAGES.arrivingAtHome()
    case TripStatus.PICKED_UP:
      return NOTIFICATION_MESSAGES.pickedUp(childFirstName)
    case TripStatus.IN_TRANSIT:
      return NOTIFICATION_MESSAGES.inTransit(childFirstName)
    case TripStatus.COMPLETED:
      return NOTIFICATION_MESSAGES.delivered(childFirstName)
    case TripStatus.DELAYED:
      return NOTIFICATION_MESSAGES.delayed(formatTime(estimatedArrivalIso))
    default:
      return null
  }
}

export function getNotificationTypeForStatus(status: TripStatus): NotificationType {
  switch (status) {
    case TripStatus.PICKED_UP:
      return NotificationType.CHILD_PICKED_UP
    case TripStatus.COMPLETED:
      return NotificationType.CHILD_DELIVERED
    case TripStatus.DELAYED:
      return NotificationType.DELAY
    case TripStatus.INCIDENT:
      return NotificationType.INCIDENT
    default:
      return NotificationType.VEHICLE_APPROACHING
  }
}
