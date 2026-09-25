import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'

export interface PassengerRepository {
  getPassengers(): Promise<Passenger[]>
  getPassengerById(id: string): Promise<Passenger>
  registerPassenger(passenger: Omit<Passenger, 'id'>): Promise<Passenger>
  // Llamada separada a propósito (rule 12): pedir la info sensible es un
  // acto explícito, nunca algo que viaje junto al listado general.
  getSensitiveInfo(passengerId: string): Promise<PassengerSensitiveInfo>
}
