import type { TripStatus } from '@/domain/enums/TripStatus'
import type { Address, GeoCoordinates } from '@/domain/valueObjects/Address'

import type { TripEvent } from './TripEvent'

// El origen y destino se copian al crear el traslado (en vez de leerse en
// vivo desde el pasajero): así, si el domicilio del niño cambia a futuro,
// los traslados ya finalizados conservan la dirección real que se usó.
export interface Trip {
  readonly id: string
  readonly passengerId: string
  readonly driverId: string
  readonly vehicleId: string
  readonly origin: Address
  readonly destination: Address
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  readonly status: TripStatus
  readonly delayMinutes: number
  readonly currentLocation: GeoCoordinates | null
  readonly events: readonly TripEvent[]
  // Hitos de notificación ya enviados (ej. "NEAR_PICKUP"). Se usa para no
  // notificar dos veces el mismo evento (rule 48).
  readonly notifiedMilestones: readonly string[]
  // Horarios reales (vs. programados/estimados), para poder analizar
  // después si conviene ajustar el horario de salida. null hasta que
  // ocurren (se completan solos al cambiar de estado, ver
  // UpdateTripStatusUseCase).
  readonly actualDepartureAt: string | null
  readonly actualArrivalAt: string | null
}
