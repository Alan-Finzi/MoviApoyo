import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'

// Caso de uso separado a propósito (rule 12): pedir información sensible es
// una acción explícita y distinta de listar pasajeros, nunca algo que
// ocurra "de paso" al cargar un listado general.
export class GetPassengerSensitiveInfoUseCase {
  constructor(private readonly passengerRepository: PassengerRepository) {}

  execute(passengerId: string): Promise<PassengerSensitiveInfo> {
    return this.passengerRepository.getSensitiveInfo(passengerId)
  }
}
