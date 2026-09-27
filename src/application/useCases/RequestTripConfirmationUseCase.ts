import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import type { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

// Dispara el recordatorio por WhatsApp al padre/tutor (rule pedida: "El
// sistema envía: 'Juan Pérez tiene un viaje mañana a las 08:30'"). Mover el
// traslado a CONFIRMACION_PENDIENTE ya dispara el mensaje correspondiente
// (ver TripNotificationRules/UpdateTripStatusUseCase) — sin esto el
// familiar nunca ve nada para confirmar o cancelar.
export class RequestTripConfirmationUseCase {
  constructor(private readonly updateTripStatusUseCase: UpdateTripStatusUseCase) {}

  execute(tripId: string): Promise<Trip> {
    return this.updateTripStatusUseCase.execute(tripId, TripStatus.CONFIRMATION_PENDING)
  }
}
