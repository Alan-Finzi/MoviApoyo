import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import type { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

export interface ConfirmTripInput {
  readonly tripId: string
  readonly guardianFullName: string
  readonly relationship: string
}

// Registra la confirmación del familiar (por WhatsApp, ver
// functions/src/whatsappWebhook.ts). Quién confirmó y su relación con el
// paciente quedan en el propio TripEvent.actor — no se agregan campos nuevos
// a Trip para esto porque el historial ya es la fuente de verdad (rule
// pedida: "no depender solo del estado actual del viaje").
export class ConfirmTripUseCase {
  constructor(private readonly updateTripStatusUseCase: UpdateTripStatusUseCase) {}

  execute(input: ConfirmTripInput): Promise<Trip> {
    return this.updateTripStatusUseCase.execute(
      input.tripId,
      TripStatus.CONFIRMED,
      `${input.guardianFullName} (${input.relationship})`,
    )
  }
}
