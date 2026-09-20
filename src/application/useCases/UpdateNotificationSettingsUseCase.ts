import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import { ValidationError } from '@/shared/errors/AppError'

export class UpdateNotificationSettingsUseCase {
  constructor(private readonly notificationSettingsRepository: NotificationSettingsRepository) {}

  // Declarado "async" a propósito (aunque no haga falta ningún await extra):
  // así, si las validaciones fallan, el error llega siempre como un rechazo
  // de la Promise devuelta, nunca como una excepción síncrona. Un
  // consumidor que haga `useCase.execute(...).catch(...)` debe poder
  // confiar en eso sin sorpresas.
  async execute(settings: NotificationSettings): Promise<NotificationSettings> {
    if (
      settings.criterion === ProximityCriterion.DISTANCE &&
      settings.distanceThresholdMeters <= 0
    ) {
      throw new ValidationError('La distancia de aviso debe ser mayor a 0.')
    }
    if (settings.criterion === ProximityCriterion.TIME && settings.timeThresholdMinutes <= 0) {
      throw new ValidationError('El tiempo de aviso debe ser mayor a 0.')
    }
    if (settings.blockLengthMeters <= 0) {
      throw new ValidationError('La longitud de cuadra configurada debe ser mayor a 0.')
    }
    return await this.notificationSettingsRepository.updateSettings(settings)
  }
}
