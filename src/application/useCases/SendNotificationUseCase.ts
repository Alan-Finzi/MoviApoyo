import { NotificationStatus } from '@/domain/enums/NotificationStatus'
import type { AppNotification } from '@/domain/entities/Notification'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'
import type {
  NotificationService,
  SendNotificationInput,
} from '@/domain/services/NotificationService'
import { Logger } from '@/shared/utils/Logger'

// Punto único por el que pasa cualquier notificación saliente. Intenta
// enviarla a través de NotificationService (Mock hoy, WhatsApp mañana) y,
// pase lo que pase, deja constancia en NotificationRepository para que
// aparezca en el centro de notificaciones (rule 14).
export class SendNotificationUseCase {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(input: SendNotificationInput): Promise<AppNotification> {
    let status: (typeof NotificationStatus)[keyof typeof NotificationStatus] =
      NotificationStatus.PENDING

    try {
      await this.notificationService.sendNotification(input)
      status = NotificationStatus.SENT
    } catch (error) {
      status = NotificationStatus.FAILED
      Logger.warn('No se pudo enviar la notificación', { tripId: input.tripId, type: input.type })
      Logger.error('Detalle del error de notificación', error)
    }

    return this.notificationRepository.saveNotification({
      tripId: input.tripId,
      guardianId: input.guardianId,
      type: input.type,
      channel: input.channel,
      message: input.message,
      status,
      createdAt: new Date().toISOString(),
    })
  }
}
