import { TripStatus } from '@/domain/enums/TripStatus'
import type { Trip } from '@/domain/entities/Trip'
import type { TripRepository } from '@/domain/repositories/TripRepository'

import type { UpdateTripStatusUseCase } from './UpdateTripStatusUseCase'

// Pasos previos a que el chofer efectivamente salga (confirmación del
// familiar, aceptación del chofer — ver TripStatusMachine). Todavía no existe
// el flujo de WhatsApp que los dispare uno por uno (Fase 4 pendiente), así
// que "Iniciar traslado" desde la web los recorre en secuencia: cada paso
// queda igual como su propio TripEvent con su propio timestamp, en vez de
// saltearlos silenciosamente.
const PRE_DEPARTURE_STATUSES: readonly TripStatus[] = [
  TripStatus.CONFIRMATION_PENDING,
  TripStatus.CONFIRMED,
  TripStatus.DRIVER_ACCEPTED,
  TripStatus.ON_THE_WAY,
]

// El chofer puede llamar a esto desde SCHEDULED, o desde cualquier paso
// intermedio ya alcanzado por WhatsApp (ej. el familiar ya confirmó) — en
// ese caso solo recorre lo que falta, no repite pasos ya hechos.
function remainingPreDepartureStatuses(currentStatus: TripStatus): readonly TripStatus[] {
  if (currentStatus === TripStatus.SCHEDULED) return PRE_DEPARTURE_STATUSES
  const index = PRE_DEPARTURE_STATUSES.indexOf(currentStatus)
  return index === -1 ? [] : PRE_DEPARTURE_STATUSES.slice(index + 1)
}

export class StartTripUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly updateTripStatusUseCase: UpdateTripStatusUseCase,
  ) {}

  async execute(tripId: string, startedBy = 'Sistema'): Promise<Trip> {
    const currentTrip = await this.tripRepository.getTripById(tripId)

    let trip = currentTrip
    for (const status of remainingPreDepartureStatuses(currentTrip.status)) {
      trip = await this.updateTripStatusUseCase.execute(tripId, status, startedBy)
    }
    return trip
  }
}
