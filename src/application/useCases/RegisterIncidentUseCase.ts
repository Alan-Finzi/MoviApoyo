import { NotificationChannel } from '@/domain/enums/NotificationChannel'
import { NotificationType } from '@/domain/enums/NotificationType'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { IncidentType } from '@/domain/enums/IncidentType'
import type { Incident } from '@/domain/entities/Incident'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import { getEventTypeForStatus } from '@/domain/services/TripNotificationRules'
import { canTransitionTripStatus } from '@/domain/services/TripStatusMachine'
import { NOTIFICATION_MESSAGES } from '@/shared/constants/messages.constants'
import { INCIDENT_TYPE_LABELS } from '@/shared/constants/notification.constants'
import { addMinutes, formatTime } from '@/shared/utils/date'
import { ValidationError } from '@/shared/errors/AppError'

import type { SendNotificationUseCase } from './SendNotificationUseCase'

export interface RegisterIncidentInput {
  readonly tripId: string
  readonly type: IncidentType
  readonly description: string
  readonly estimatedDelayMinutes: number
  readonly observations?: string
  readonly reportedBy: string
  readonly location?: GeoCoordinates
}

// Registra un inconveniente (rule 9), mueve el traslado a estado INCIDENTE,
// recalcula el horario estimado de llegada y notifica al padre/tutor con el
// nuevo horario (rule 2, último ejemplo del enunciado).
export class RegisterIncidentUseCase {
  constructor(
    private readonly incidentRepository: IncidentRepository,
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async execute(input: RegisterIncidentInput): Promise<Incident> {
    const trip = await this.tripRepository.getTripById(input.tripId)

    if (!canTransitionTripStatus(trip.status, TripStatus.INCIDENT)) {
      throw new ValidationError(
        `No es posible registrar un incidente para un traslado en estado "${trip.status}".`,
      )
    }

    const incident = await this.incidentRepository.registerIncident({
      tripId: input.tripId,
      type: input.type,
      description: input.description,
      timestamp: new Date().toISOString(),
      location: input.location,
      estimatedDelayMinutes: input.estimatedDelayMinutes,
      observations: input.observations,
      reportedBy: input.reportedBy,
    })

    const newEstimatedArrival = addMinutes(trip.estimatedArrival, input.estimatedDelayMinutes)

    const updatedTrip = await this.tripRepository.updateTrip(input.tripId, {
      status: TripStatus.INCIDENT,
      delayMinutes: trip.delayMinutes + input.estimatedDelayMinutes,
      estimatedArrival: newEstimatedArrival,
    })

    await this.tripRepository.appendTripEvent(input.tripId, {
      tripId: input.tripId,
      type: getEventTypeForStatus(TripStatus.INCIDENT),
      timestamp: incident.timestamp,
      location: incident.location,
      description: `Incidente registrado: ${INCIDENT_TYPE_LABELS[input.type]}. ${input.description}`,
      actor: input.reportedBy,
    })

    const passenger = await this.passengerRepository.getPassengerById(updatedTrip.passengerId)

    await this.sendNotificationUseCase.execute({
      tripId: input.tripId,
      guardianId: passenger.guardianId,
      type: NotificationType.INCIDENT,
      channel: NotificationChannel.WHATSAPP,
      message: NOTIFICATION_MESSAGES.delayed(formatTime(newEstimatedArrival)),
    })

    return incident
  }
}
