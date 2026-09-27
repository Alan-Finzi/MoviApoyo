import { describe, expect, it, vi } from 'vitest'

import type { Passenger } from '@/domain/entities/Passenger'
import type { Trip } from '@/domain/entities/Trip'
import type { TripEvent } from '@/domain/entities/TripEvent'
import { PassengerStatus } from '@/domain/enums/PassengerStatus'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { NotificationRepository } from '@/domain/repositories/NotificationRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripMutableFields, TripRepository } from '@/domain/repositories/TripRepository'
import type { NotificationService } from '@/domain/services/NotificationService'
import { ValidationError } from '@/shared/errors/AppError'

import { CancelTripByGuardianUseCase } from './CancelTripByGuardianUseCase'
import { ConfirmTripUseCase } from './ConfirmTripUseCase'
import { RequestTripConfirmationUseCase } from './RequestTripConfirmationUseCase'
import { SendNotificationUseCase } from './SendNotificationUseCase'
import { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    passengerId: 'passenger-1',
    driverId: 'driver-1',
    vehicleId: 'vehicle-1',
    origin: { street: 'Calle 1', coordinates: { latitude: 0, longitude: 0 } },
    destination: { street: 'Calle 2', coordinates: { latitude: 1, longitude: 1 } },
    scheduledDeparture: '2026-05-04T11:30:00.000Z',
    estimatedArrival: '2026-05-04T12:00:00.000Z',
    status: TripStatus.SCHEDULED,
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
  status: PassengerStatus.ACTIVE,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

function buildUpdateTripStatusUseCase(trip: Trip) {
  let currentTrip = trip
  const events: TripEvent[] = []

  const tripRepository: TripRepository = {
    getTrips: () => Promise.resolve([currentTrip]),
    getTripById: () => Promise.resolve(currentTrip),
    registerTrip: () => Promise.reject(new Error('no usado en este test')),
    updateTrip: (_id: string, changes: TripMutableFields) => {
      currentTrip = { ...currentTrip, ...changes }
      return Promise.resolve(currentTrip)
    },
    appendTripEvent: (_id: string, event: Omit<TripEvent, 'id'>) => {
      events.push({ ...event, id: `event-${events.length.toString()}` })
      currentTrip = { ...currentTrip, events: [...currentTrip.events, events.at(-1) as TripEvent] }
      return Promise.resolve(currentTrip)
    },
    markMilestoneNotified: () => Promise.reject(new Error('no usado en este test')),
    subscribe: () => () => undefined,
  }
  const passengerRepository: PassengerRepository = {
    getPassengers: () => Promise.reject(new Error('no usado en este test')),
    getPassengerById: () => Promise.resolve(passenger),
    registerPassenger: () => Promise.reject(new Error('no usado en este test')),
    getSensitiveInfo: () => Promise.reject(new Error('no usado en este test')),
    updateSensitiveInfo: () => Promise.reject(new Error('no usado en este test')),
  }
  const notificationRepository: NotificationRepository = {
    getNotifications: () => Promise.reject(new Error('no usado en este test')),
    saveNotification: (input) =>
      Promise.resolve({ ...input, id: 'notification-1', createdAt: new Date().toISOString() }),
    subscribe: () => () => undefined,
  }
  const notificationService: NotificationService = { sendNotification: vi.fn(() => Promise.resolve()) }
  const sendNotificationUseCase = new SendNotificationUseCase(
    notificationService,
    notificationRepository,
  )
  const updateTripStatusUseCase = new UpdateTripStatusUseCase(
    tripRepository,
    passengerRepository,
    sendNotificationUseCase,
  )

  return { updateTripStatusUseCase, getEvents: () => events, notificationService }
}

describe('RequestTripConfirmationUseCase', () => {
  it('mueve el traslado a CONFIRMACION_PENDIENTE y dispara la notificación', async () => {
    const { updateTripStatusUseCase, notificationService } = buildUpdateTripStatusUseCase(
      buildTrip(),
    )
    const useCase = new RequestTripConfirmationUseCase(updateTripStatusUseCase)

    const result = await useCase.execute('trip-1')

    expect(result.status).toBe(TripStatus.CONFIRMATION_PENDING)
    // eslint-disable-next-line @typescript-eslint/unbound-method -- es un mock de vitest, no un método real con "this".
    expect(notificationService.sendNotification).toHaveBeenCalledTimes(1)
  })
})

describe('ConfirmTripUseCase', () => {
  it('confirma un traslado en CONFIRMACION_PENDIENTE y deja al familiar como actor', async () => {
    const { updateTripStatusUseCase, getEvents } = buildUpdateTripStatusUseCase(
      buildTrip({ status: TripStatus.CONFIRMATION_PENDING }),
    )
    const useCase = new ConfirmTripUseCase(updateTripStatusUseCase)

    const result = await useCase.execute({
      tripId: 'trip-1',
      guardianFullName: 'María Gómez',
      relationship: 'Madre',
    })

    expect(result.status).toBe(TripStatus.CONFIRMED)
    expect(getEvents().at(-1)?.actor).toBe('María Gómez (Madre)')
  })

  it('no permite confirmar un traslado que nunca pasó por CONFIRMACION_PENDIENTE', async () => {
    const { updateTripStatusUseCase } = buildUpdateTripStatusUseCase(
      buildTrip({ status: TripStatus.SCHEDULED }),
    )
    const useCase = new ConfirmTripUseCase(updateTripStatusUseCase)

    await expect(
      useCase.execute({ tripId: 'trip-1', guardianFullName: 'María Gómez', relationship: 'Madre' }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})

describe('CancelTripByGuardianUseCase', () => {
  it('cancela el traslado y registra motivo y actor', async () => {
    const { updateTripStatusUseCase, getEvents } = buildUpdateTripStatusUseCase(buildTrip())
    const useCase = new CancelTripByGuardianUseCase(updateTripStatusUseCase)

    const result = await useCase.execute({
      tripId: 'trip-1',
      guardianFullName: 'María Gómez',
      relationship: 'Madre',
      reason: 'El paciente tiene fiebre',
    })

    expect(result.status).toBe(TripStatus.CANCELLED)
    const lastEvent = getEvents().at(-1)
    expect(lastEvent?.actor).toBe('María Gómez (Madre)')
    expect(lastEvent?.reason).toBe('El paciente tiene fiebre')
    expect(lastEvent?.description).toContain('El paciente tiene fiebre')
  })

  it('exige un motivo para cancelar', async () => {
    const { updateTripStatusUseCase } = buildUpdateTripStatusUseCase(buildTrip())
    const useCase = new CancelTripByGuardianUseCase(updateTripStatusUseCase)

    await expect(
      useCase.execute({
        tripId: 'trip-1',
        guardianFullName: 'María Gómez',
        relationship: 'Madre',
        reason: '   ',
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })
})
