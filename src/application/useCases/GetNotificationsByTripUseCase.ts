import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'

// Arma la sección "Notificaciones" del detalle del viaje (rule pedida: "qué
// comunicaciones fueron enviadas" a la vista sin salir de la pantalla).
export class GetNotificationsByTripUseCase {
  constructor(private readonly notificationRepository: NotificationRepository) {}

  async execute(tripId: string): Promise<AppNotification[]> {
    const notifications = await this.notificationRepository.getNotifications()
    return notifications
      .filter((notification) => notification.tripId === tripId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
}
