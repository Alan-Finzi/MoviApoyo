import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'
import { ValidationError } from '@/shared/errors/AppError'

import type { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

export interface CancelTripByGuardianInput {
  readonly tripId: string
  readonly guardianFullName: string
  readonly relationship: string
  readonly reason: string
}

// Cancelación pedida por el familiar (por WhatsApp). A diferencia de
// ConfirmTripUseCase, acá el motivo es obligatorio (rule pedida: "solicitar
// motivo y registrar quién realizó la cancelación").
export class CancelTripByGuardianUseCase {
  constructor(private readonly updateTripStatusUseCase: UpdateTripStatusUseCase) {}

  async execute(input: CancelTripByGuardianInput): Promise<Trip> {
    if (!input.reason.trim()) {
      throw new ValidationError('Ingresá el motivo de la cancelación.')
    }
    return this.updateTripStatusUseCase.execute(
      input.tripId,
      TripStatus.CANCELLED,
      `${input.guardianFullName} (${input.relationship})`,
      input.reason,
    )
  }
}
