import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { passengerSensitiveInfoSeed } from './fixtures/seedData'
import { passengersStore } from './stores'

// Mutable a propósito (a diferencia de passengersSeed, que es el estado
// inicial): acá se acumulan los cambios de updateSensitiveInfo durante la
// sesión, igual que passengersStore hace con los pacientes.
const sensitiveInfoState = new Map<string, PassengerSensitiveInfo>(
  Object.entries(passengerSensitiveInfoSeed),
)

export class MockPassengerRepository implements PassengerRepository {
  getPassengers(): Promise<Passenger[]> {
    return Promise.resolve(passengersStore.getState())
  }

  getPassengerById(id: string): Promise<Passenger> {
    const passenger = passengersStore.getState().find((item) => item.id === id)
    if (!passenger) throw new NotFoundError(`No existe el pasajero con id "${id}".`)
    return Promise.resolve(passenger)
  }

  registerPassenger(
    passenger: Omit<Passenger, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Passenger> {
    const now = new Date().toISOString()
    const newPassenger: Passenger = {
      ...passenger,
      id: `passenger-${crypto.randomUUID()}`,
      createdAt: now,
      updatedAt: now,
    }
    passengersStore.setState((passengers) => [...passengers, newPassenger])
    return Promise.resolve(newPassenger)
  }

  getSensitiveInfo(passengerId: string): Promise<PassengerSensitiveInfo> {
    const info = sensitiveInfoState.get(passengerId)
    if (!info) {
      throw new NotFoundError(`No hay información sensible registrada para "${passengerId}".`)
    }
    return Promise.resolve(info)
  }

  updateSensitiveInfo(
    passengerId: string,
    info: Omit<PassengerSensitiveInfo, 'passengerId' | 'updatedAt'>,
  ): Promise<PassengerSensitiveInfo> {
    const updated: PassengerSensitiveInfo = {
      ...info,
      passengerId,
      updatedAt: new Date().toISOString(),
    }
    sensitiveInfoState.set(passengerId, updated)
    return Promise.resolve(updated)
  }
}
