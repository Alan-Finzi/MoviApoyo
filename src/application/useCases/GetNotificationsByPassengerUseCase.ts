import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'

import type { GetTripsByPassengerUseCase } from './GetTripsByPassengerUseCase'

// Arma la pestaña "Notificaciones" de la ficha del paciente: todas las
// notificaciones que se generaron para alguno de sus viajes.
export class GetNotificationsByPassengerUseCase {
  constructor(
    private readonly getTripsByPassengerUseCase: GetTripsByPassengerUseCase,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(passengerId: string): Promise<AppNotification[]> {
    const trips = await this.getTripsByPassengerUseCase.execute(passengerId)
    const tripIds = new Set(trips.map((trip) => trip.id))

    const notifications = await this.notificationRepository.getNotifications()
    return notifications
      .filter((notification) => tripIds.has(notification.tripId))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}
