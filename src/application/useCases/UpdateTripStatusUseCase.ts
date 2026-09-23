import { NotificationChannel } from '@/domain/enums/NotificationChannel'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { Trip } from '@/domain/entities/Trip'
import type { TripMutableFields } from '@/domain/repositories/TripRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import {
  getEventTypeForStatus,
  getNotificationMessageForStatus,
  getNotificationTypeForStatus,
} from '@/domain/services/TripNotificationRules'
import { canTransitionTripStatus } from '@/domain/services/TripStatusMachine'
import { TRIP_STATUS_LABELS } from '@/shared/constants/trip.constants'
import { ValidationError } from '@/shared/errors/AppError'

import type { SendNotificationUseCase } from './SendNotificationUseCase'

// Único lugar donde un traslado cambia de estado (rule 47): valida la
// transición, deja el evento de auditoría correspondiente y dispara la
// notificación al padre/tutor cuando ese estado lo amerita (rule 2).
export class UpdateTripStatusUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async execute(tripId: string, nextStatus: TripStatus): Promise<Trip> {
    const currentTrip = await this.tripRepository.getTripById(tripId)

    if (!canTransitionTripStatus(currentTrip.status, nextStatus)) {
      throw new ValidationError(
        `No es posible pasar de "${TRIP_STATUS_LABELS[currentTrip.status]}" a "${TRIP_STATUS_LABELS[nextStatus]}".`,
      )
    }

    // Se registra la hora real de salida/llegada (no la programada/estimada)
    // para poder comparar después y sugerir ajustes de horario (ver
    // GetScheduleRecommendationUseCase).
    const changes: TripMutableFields = {
      status: nextStatus,
      ...(nextStatus === TripStatus.ON_THE_WAY && { actualDepartureAt: new Date().toISOString() }),
      ...(nextStatus === TripStatus.COMPLETED && { actualArrivalAt: new Date().toISOString() }),
    }

    const updatedTrip = await this.tripRepository.updateTrip(tripId, changes)

    const passenger = await this.passengerRepository.getPassengerById(updatedTrip.passengerId)

    await this.tripRepository.appendTripEvent(tripId, {
      tripId,
      type: getEventTypeForStatus(nextStatus),
      timestamp: new Date().toISOString(),
      location: updatedTrip.currentLocation ?? undefined,
      description: `Traslado actualizado a "${TRIP_STATUS_LABELS[nextStatus]}".`,
      actor: 'Sistema',
    })

    const message = getNotificationMessageForStatus(
      nextStatus,
      passenger.firstName,
      updatedTrip.estimatedArrival,
    )

    if (message) {
      await this.sendNotificationUseCase.execute({
        tripId,
        guardianId: passenger.guardianId,
        type: getNotificationTypeForStatus(nextStatus),
        channel: NotificationChannel.WHATSAPP,
        message,
      })
    }

    return updatedTrip
  }
}
