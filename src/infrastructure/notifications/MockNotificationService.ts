import type {
  NotificationService,
  SendNotificationInput,
} from '@/domain/services/NotificationService'
import { Logger } from '@/shared/utils/Logger'

// Implementación inicial de NotificationService (rule 3): no llama a
// ninguna API externa, solo deja constancia en el log y simula la latencia
// de un proveedor real. WhatsAppNotificationService la reemplazará más
// adelante implementando el mismo contrato, sin tocar Application ni UI.
export class MockNotificationService implements NotificationService {
  async sendNotification(input: SendNotificationInput): Promise<void> {
    Logger.info('Notificación (mock) enviada por WhatsApp', {
      tripId: input.tripId,
      type: input.type,
    })
    await new Promise((resolve) => setTimeout(resolve, 150))
  }
}
