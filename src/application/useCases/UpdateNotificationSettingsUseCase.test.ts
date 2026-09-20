import { describe, expect, it, vi } from 'vitest'

import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import { ValidationError } from '@/shared/errors/AppError'

import { UpdateNotificationSettingsUseCase } from './UpdateNotificationSettingsUseCase'

function buildRepository(): NotificationSettingsRepository {
  return {
    getSettings: vi.fn(() => Promise.reject(new Error('no usado en este test'))),
    updateSettings: vi.fn((settings: NotificationSettings) => Promise.resolve(settings)),
  }
}

const baseSettings: NotificationSettings = {
  criterion: ProximityCriterion.DISTANCE,
  distanceThresholdMeters: 300,
  timeThresholdMinutes: 5,
  blockLengthMeters: 100,
}

describe('UpdateNotificationSettingsUseCase', () => {
  it('guarda la configuración cuando los valores son válidos', async () => {
    const repository = buildRepository()
    const useCase = new UpdateNotificationSettingsUseCase(repository)

    const result = await useCase.execute(baseSettings)

    expect(result).toEqual(baseSettings)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- es un mock de vitest, no un método real con "this".
    expect(repository.updateSettings).toHaveBeenCalledWith(baseSettings)
  })

  it('rechaza una distancia de aviso menor o igual a 0', async () => {
    const useCase = new UpdateNotificationSettingsUseCase(buildRepository())

    await expect(
      useCase.execute({ ...baseSettings, distanceThresholdMeters: 0 }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rechaza un tiempo de aviso menor o igual a 0 cuando el criterio es por tiempo', async () => {
    const useCase = new UpdateNotificationSettingsUseCase(buildRepository())

    await expect(
      useCase.execute({
        ...baseSettings,
        criterion: ProximityCriterion.TIME,
        timeThresholdMinutes: 0,
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('rechaza una longitud de cuadra inválida', async () => {
    const useCase = new UpdateNotificationSettingsUseCase(buildRepository())

    await expect(useCase.execute({ ...baseSettings, blockLengthMeters: 0 })).rejects.toBeInstanceOf(
      ValidationError,
    )
  })
})
