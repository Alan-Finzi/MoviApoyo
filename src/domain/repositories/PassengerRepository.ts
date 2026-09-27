import type { Passenger, PassengerSensitiveInfo } from '@/domain/entities/Passenger'

export interface PassengerRepository {
  getPassengers(): Promise<Passenger[]>
  getPassengerById(id: string): Promise<Passenger>
  // createdAt/updatedAt los pone el repositorio (no el caso de uso): son un
  // detalle de infraestructura, no algo que el alta de paciente deba decidir.
  registerPassenger(
    passenger: Omit<Passenger, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Passenger>
  // Llamada separada a propósito (rule 12): pedir la info sensible es un
  // acto explícito, nunca algo que viaje junto al listado general.
  getSensitiveInfo(passengerId: string): Promise<PassengerSensitiveInfo>
  // Reemplaza (upsert) la información sensible de un paciente. Separado de
  // registerPassenger a propósito, mismo criterio que getSensitiveInfo.
  updateSensitiveInfo(
    passengerId: string,
    info: Omit<PassengerSensitiveInfo, 'passengerId' | 'updatedAt'>,
  ): Promise<PassengerSensitiveInfo>
}
