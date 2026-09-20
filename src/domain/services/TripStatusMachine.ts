import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import { getEventTypeForStatus } from './TripNotificationRules'

// Tabla de transiciones válidas. No es una interfaz (no hay una
// implementación "real" distinta de esta): es lógica de negocio pura, por
// eso vive en Domain como funciones en lugar de como contrato + Infra.
const ALLOWED_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  [TripStatus.SCHEDULED]: [TripStatus.ON_THE_WAY, TripStatus.CANCELLED],
  [TripStatus.ON_THE_WAY]: [
    TripStatus.NEAR_HOME,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
    TripStatus.CANCELLED,
  ],
  [TripStatus.NEAR_HOME]: [TripStatus.ARRIVING, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.ARRIVING]: [TripStatus.PICKED_UP, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.PICKED_UP]: [TripStatus.IN_TRANSIT],
  [TripStatus.IN_TRANSIT]: [TripStatus.NEAR_DESTINATION, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.NEAR_DESTINATION]: [TripStatus.COMPLETED, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.COMPLETED]: [],
  // Desde un estado excepcional se puede retomar el recorrido en cualquier
  // punto donde estaba, o cancelarse.
  [TripStatus.DELAYED]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.CANCELLED,
  ],
  [TripStatus.INCIDENT]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.CANCELLED,
  ],
  [TripStatus.CANCELLED]: [],
}

// Evita que un traslado salte de forma arbitraria entre estados (ej. de
// PROGRAMADO a FINALIZADO sin pasar por el resto del recorrido) (rule 47).
export function canTransitionTripStatus(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function getNextPossibleStatuses(from: TripStatus): readonly TripStatus[] {
  return ALLOWED_TRANSITIONS[from]
}

// Orden del "camino feliz", usado para renderizar la línea de progreso en
// el detalle del traslado (rule 7). Los estados excepcionales no forman
// parte de esta línea: se muestran aparte, como alerta.
export const HAPPY_PATH_TRIP_STATUSES: readonly TripStatus[] = [
  TripStatus.SCHEDULED,
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
  TripStatus.COMPLETED,
]

export function isExceptionalStatus(status: TripStatus): boolean {
  return (
    status === TripStatus.DELAYED ||
    status === TripStatus.INCIDENT ||
    status === TripStatus.CANCELLED
  )
}

// Para dibujar la línea de progreso (rule 7) incluso cuando el traslado está
// en un estado excepcional (DEMORADO/INCIDENTE): busca hasta dónde había
// avanzado dentro del "camino feliz" antes de entrar en ese estado, mirando
// el último evento de auditoría que corresponda a un paso de esa línea.
export function resolveHappyPathStatus(trip: Trip): TripStatus {
  if (HAPPY_PATH_TRIP_STATUSES.includes(trip.status)) return trip.status

  for (let index = HAPPY_PATH_TRIP_STATUSES.length - 1; index >= 0; index -= 1) {
    const candidate = HAPPY_PATH_TRIP_STATUSES[index]
    if (!candidate) continue
    const eventType = getEventTypeForStatus(candidate)
    if (trip.events.some((event) => event.type === eventType)) return candidate
  }

  return TripStatus.SCHEDULED
}
