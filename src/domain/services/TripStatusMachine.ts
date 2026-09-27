import type { Trip } from '@/domain/entities/Trip'
import { TripStatus } from '@/domain/enums/TripStatus'

import { getEventTypeForStatus } from './TripNotificationRules'

// Tabla de transiciones válidas. No es una interfaz (no hay una
// implementación "real" distinta de esta): es lógica de negocio pura, por
// eso vive en Domain como funciones en lugar de como contrato + Infra.
const ALLOWED_TRANSITIONS: Record<TripStatus, readonly TripStatus[]> = {
  // Desde que se crea el viaje (ya con chofer/vehículo elegidos, ver
  // RegisterTripUseCase) hasta que el chofer efectivamente sale, el viaje
  // pasa por la confirmación del familiar y la aceptación del chofer. Se
  // puede cancelar o reprogramar en cualquier punto antes de salir.
  [TripStatus.SCHEDULED]: [
    TripStatus.CONFIRMATION_PENDING,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.CONFIRMATION_PENDING]: [
    TripStatus.CONFIRMED,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.CONFIRMED]: [
    TripStatus.DRIVER_ACCEPTED,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.DRIVER_ACCEPTED]: [
    TripStatus.ON_THE_WAY,
    TripStatus.CANCELLED,
    TripStatus.RESCHEDULED,
  ],
  [TripStatus.ON_THE_WAY]: [
    TripStatus.NEAR_HOME,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
    TripStatus.CANCELLED,
  ],
  [TripStatus.NEAR_HOME]: [TripStatus.ARRIVING, TripStatus.DELAYED, TripStatus.INCIDENT],
  // NO_SHOW se descubre acá: el chofer llegó, esperó, y el paciente no salió.
  [TripStatus.ARRIVING]: [
    TripStatus.PICKED_UP,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
    TripStatus.NO_SHOW,
  ],
  [TripStatus.PICKED_UP]: [TripStatus.IN_TRANSIT],
  [TripStatus.IN_TRANSIT]: [TripStatus.NEAR_DESTINATION, TripStatus.DELAYED, TripStatus.INCIDENT],
  [TripStatus.NEAR_DESTINATION]: [
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
  ],
  // Llegar al destino y finalizar el viaje son dos momentos distintos (ver
  // el mismo paso ya separado en NEAR_HOME→ARRIVING→PICKED_UP): permite
  // registrar "cuándo llegó" separado de "cuándo terminó" (rule pedida:
  // trazabilidad completa).
  [TripStatus.ARRIVED_AT_DESTINATION]: [
    TripStatus.COMPLETED,
    TripStatus.DELAYED,
    TripStatus.INCIDENT,
  ],
  [TripStatus.COMPLETED]: [],
  // Desde un estado excepcional se puede retomar el recorrido en cualquier
  // punto donde estaba, cancelarse, o darse por no realizado si no se puede
  // resolver.
  [TripStatus.DELAYED]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.CANCELLED,
    TripStatus.NOT_COMPLETED,
  ],
  [TripStatus.INCIDENT]: [
    TripStatus.ON_THE_WAY,
    TripStatus.NEAR_HOME,
    TripStatus.ARRIVING,
    TripStatus.IN_TRANSIT,
    TripStatus.NEAR_DESTINATION,
    TripStatus.ARRIVED_AT_DESTINATION,
    TripStatus.CANCELLED,
    TripStatus.NOT_COMPLETED,
  ],
  [TripStatus.CANCELLED]: [],
  [TripStatus.NO_SHOW]: [],
  [TripStatus.RESCHEDULED]: [],
  [TripStatus.NOT_COMPLETED]: [],
}

// Evita que un traslado salte de forma arbitraria entre estados (ej. de
// PROGRAMADO a FINALIZADO sin pasar por el resto del recorrido) (rule 47).
export function canTransitionTripStatus(from: TripStatus, to: TripStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to)
}

export function getNextPossibleStatuses(from: TripStatus): readonly TripStatus[] {
  return ALLOWED_TRANSITIONS[from]
}

// Un estado es terminal cuando no tiene ninguna transición posible — se
// deriva de la misma tabla en vez de mantener una segunda lista, para que no
// puedan desincronizarse. Se usa para saber si un viaje sigue "ocupando" a
// su chofer/vehículo (rule pedida: detectar solapamientos de agenda) y para
// impedir reasignar chofer/vehículo en un traslado ya cerrado.
export function isTerminalTripStatus(status: TripStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0
}

// Orden del "camino feliz", usado para renderizar la línea de progreso en
// el detalle del traslado (rule 7). Los estados excepcionales no forman
// parte de esta línea: se muestran aparte, como alerta.
export const HAPPY_PATH_TRIP_STATUSES: readonly TripStatus[] = [
  TripStatus.SCHEDULED,
  TripStatus.CONFIRMATION_PENDING,
  TripStatus.CONFIRMED,
  TripStatus.DRIVER_ACCEPTED,
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
  TripStatus.ARRIVED_AT_DESTINATION,
  TripStatus.COMPLETED,
]

export function isExceptionalStatus(status: TripStatus): boolean {
  return (
    status === TripStatus.DELAYED ||
    status === TripStatus.INCIDENT ||
    status === TripStatus.CANCELLED ||
    status === TripStatus.NO_SHOW ||
    status === TripStatus.RESCHEDULED ||
    status === TripStatus.NOT_COMPLETED
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
