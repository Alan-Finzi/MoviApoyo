import { NotificationChannel } from '@/domain/enums/NotificationChannel'
import { NotificationType } from '@/domain/enums/NotificationType'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import type { Trip } from '@/domain/entities/Trip'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import { metersToApproxBlocks, type Distance } from '@/domain/valueObjects/Distance'
import { NEAR_PICKUP_MILESTONE } from '@/shared/constants/trip.constants'
import { NOTIFICATION_MESSAGES } from '@/shared/constants/messages.constants'

import type { SendNotificationUseCase } from './SendNotificationUseCase'

// Implementa la regla de negocio de la rule 48: cuando el vehículo entra en
// el radio configurado (por distancia o por tiempo estimado), avisa una
// única vez por traslado. La marca de "ya notificado" vive en el propio
// Trip (notifiedMilestones), consultada antes de volver a notificar.
export class CheckTripProximityUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly notificationSettingsRepository: NotificationSettingsRepository,
    private readonly sendNotificationUseCase: SendNotificationUseCase,
  ) {}

  async execute(trip: Trip, distanceToPickup: Distance, etaMinutes: number): Promise<void> {
    if (trip.notifiedMilestones.includes(NEAR_PICKUP_MILESTONE)) return

    const settings = await this.notificationSettingsRepository.getSettings()
    const isNear =
      settings.criterion === ProximityCriterion.DISTANCE
        ? distanceToPickup.meters <= settings.distanceThresholdMeters
        : etaMinutes <= settings.timeThresholdMinutes

    if (!isNear) return

    const passenger = await this.passengerRepository.getPassengerById(trip.passengerId)
    const approxBlocks = metersToApproxBlocks(distanceToPickup, settings.blockLengthMeters)

    await this.sendNotificationUseCase.execute({
      tripId: trip.id,
      guardianId: passenger.guardianId,
      type: NotificationType.VEHICLE_APPROACHING,
      channel: NotificationChannel.WHATSAPP,
      message: NOTIFICATION_MESSAGES.approachingPickup(passenger.firstName, approxBlocks),
    })

    await this.tripRepository.markMilestoneNotified(trip.id, NEAR_PICKUP_MILESTONE)
  }
}
