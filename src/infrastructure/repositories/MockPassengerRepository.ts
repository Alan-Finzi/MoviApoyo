import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import { NotFoundError } from '@/shared/errors/AppError'

import { passengerSensitiveInfoSeed } from './fixtures/seedData'
import { passengersStore } from './stores'

export class MockPassengerRepository implements PassengerRepository {
  getPassengers(): Promise<Passenger[]> {
    return Promise.resolve(passengersStore.getState())
  }

  getPassengerById(id: string): Promise<Passenger> {
    const passenger = passengersStore.getState().find((item) => item.id === id)
    if (!passenger) throw new NotFoundError(`No existe el pasajero con id "${id}".`)
    return Promise.resolve(passenger)
  }

  registerPassenger(passenger: Omit<Passenger, 'id'>): Promise<Passenger> {
    const newPassenger: Passenger = { ...passenger, id: `passenger-${crypto.randomUUID()}` }
    passengersStore.setState((passengers) => [...passengers, newPassenger])
    return Promise.resolve(newPassenger)
  }

  getSensitiveInfo(passengerId: string): Promise<PassengerSensitiveInfo> {
    const info = passengerSensitiveInfoSeed[passengerId]
    if (!info) {
      throw new NotFoundError(`No hay información sensible registrada para "${passengerId}".`)
    }
    return Promise.resolve(info)
  }
}
