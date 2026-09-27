import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'

export interface UpdatePassengerSensitiveInfoInput {
  readonly passengerId: string
  readonly documentNumber?: string
  readonly bloodType?: PassengerSensitiveInfo['bloodType']
  readonly allergies?: readonly string[]
  readonly medicalNotes?: string
  readonly observations?: string
}

// Caso de uso separado a propósito (mismo criterio que
// GetPassengerSensitiveInfoUseCase, rule 12): cargar/editar información
// sensible es una acción explícita y distinta del alta general del paciente.
export class UpdatePassengerSensitiveInfoUseCase {
  constructor(private readonly passengerRepository: PassengerRepository) {}

  execute(input: UpdatePassengerSensitiveInfoInput): Promise<PassengerSensitiveInfo> {
    return this.passengerRepository.updateSensitiveInfo(input.passengerId, {
      documentNumber: input.documentNumber,
      bloodType: input.bloodType,
      allergies: input.allergies,
      medicalNotes: input.medicalNotes,
      observations: input.observations,
    })
  }
}
