import { describe, expect, it, vi } from 'vitest'

import type { Passenger } from '@/domain/entities/Passenger'
import type { Trip } from '@/domain/entities/Trip'
import type { NotificationSettings } from '@/domain/entities/NotificationSettings'
import { ProximityCriterion } from '@/domain/enums/ProximityCriterion'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'
import type { NotificationSettingsRepository } from '@/domain/repositories/NotificationSettingsRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { NotificationService } from '@/domain/services/NotificationService'

import { CheckTripProximityUseCase } from './CheckTripProximityUseCase'
import { SendNotificationUseCase } from './SendNotificationUseCase'

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: new Date().toISOString(),
    estimatedArrival: new Date().toISOString(),
    status: TripStatus.ON_THE_WAY,
    delayMinutes: 0,
    currentLocation: null,
    events: [],
    notifiedMilestones: [],
    actualDepartureAt: null,
    actualArrivalAt: null,
    ...overrides,
  }
}

const passenger: Passenger = {
  id: 'passenger-1',
  firstName: 'Juan',
  lastName: 'Pérez',
  homeAddress: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
  destinationAddress: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
  guardianId: 'guardian-1',
}

const settings: NotificationSettings = {
  criterion: ProximityCriterion.DISTANCE,
  distanceThresholdMeters: 300,
  timeThresholdMinutes: 5,
  blockLengthMeters: 100,
}

function buildUseCase() {
  const markMilestoneNotified = vi.fn((_id: string, _milestone: string) =>
    Promise.resolve(buildTrip()),
  )
  const tripRepository: TripRepository = {
    getTrips: () => Promise.reject(new Error('no usado en este test')),
    getTripById: () => Promise.reject(new Error('no usado en este test')),
    updateTrip: () => Promise.reject(new Error('no usado en este test')),
    appendTripEvent: () => Promise.reject(new Error('no usado en este test')),
    markMilestoneNotified,
    subscribe: () => () => undefined,
  }
  const passengerRepository: PassengerRepository = {
    getPassengers: () => Promise.reject(new Error('no usado en este test')),
    getPassengerById: () => Promise.resolve(passenger),
    getSensitiveInfo: () => Promise.reject(new Error('no usado en este test')),
  }
  const notificationSettingsRepository: NotificationSettingsRepository = {
    getSettings: () => Promise.resolve(settings),
    updateSettings: () => Promise.reject(new Error('no usado en este test')),
  }
  const sendNotification = vi.fn(() => Promise.resolve())
  const notificationService: NotificationService = { sendNotification }
  const notificationRepository: NotificationRepository = {
    getNotifications: () => Promise.reject(new Error('no usado en este test')),
    saveNotification: (notification) => Promise.resolve({ ...notification, id: 'notification-1' }),
    subscribe: () => () => undefined,
  }
  const sendNotificationUseCase = new SendNotificationUseCase(
    notificationService,
    notificationRepository,
  )
  const useCase = new CheckTripProximityUseCase(
    tripRepository,
    passengerRepository,
    notificationSettingsRepository,
    sendNotificationUseCase,
  )

  return { useCase, sendNotification, markMilestoneNotified }
}

describe('CheckTripProximityUseCase', () => {
  it('envía el aviso de proximidad cuando la distancia está dentro del umbral configurado', async () => {
    const { useCase, sendNotification, markMilestoneNotified } = buildUseCase()

    await useCase.execute(buildTrip(), { meters: 250 }, 3)

    expect(sendNotification).toHaveBeenCalledTimes(1)
    expect(markMilestoneNotified).toHaveBeenCalledWith('trip-1', 'NEAR_PICKUP')
  })

  it('no envía el aviso si la distancia todavía supera el umbral configurado', async () => {
    const { useCase, sendNotification, markMilestoneNotified } = buildUseCase()

    await useCase.execute(buildTrip(), { meters: 1000 }, 20)

    expect(sendNotification).not.toHaveBeenCalled()
    expect(markMilestoneNotified).not.toHaveBeenCalled()
  })

  it('no vuelve a notificar si el hito ya fue marcado (evita duplicados)', async () => {
    const { useCase, sendNotification, markMilestoneNotified } = buildUseCase()

    await useCase.execute(buildTrip({ notifiedMilestones: ['NEAR_PICKUP'] }), { meters: 50 }, 1)

    expect(sendNotification).not.toHaveBeenCalled()
    expect(markMilestoneNotified).not.toHaveBeenCalled()
  })
})
