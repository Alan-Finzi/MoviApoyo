import { TripStatus } from '@/domain/enums/TripStatus'

// Clave de hito usada para no notificar dos veces la aproximación al
// domicilio del niño (rule 48). Vive acá (no en el dominio) porque es un
// detalle de coordinación entre casos de uso, no una regla de negocio en sí.
export const NEAR_PICKUP_MILESTONE = 'NEAR_PICKUP'

// Etiquetas legibles para mostrar en la UI. Los valores del enum TripStatus
// están en mayúsculas con guión bajo (formato "de sistema"); estas etiquetas
// son la versión para humanos.
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
  [TripStatus.SCHEDULED]: 'Programado',
  [TripStatus.ON_THE_WAY]: 'Chofer en camino',
  [TripStatus.NEAR_HOME]: 'Cerca del domicilio',
  [TripStatus.ARRIVING]: 'Llegando',
  [TripStatus.PICKED_UP]: 'Niño recogido',
  [TripStatus.IN_TRANSIT]: 'En traslado',
  [TripStatus.NEAR_DESTINATION]: 'Cerca del destino',
  [TripStatus.COMPLETED]: 'Entregado',
  [TripStatus.DELAYED]: 'Demorado',
  [TripStatus.CANCELLED]: 'Cancelado',
  [TripStatus.INCIDENT]: 'Incidente',
}

// Tono visual por estado, consumido por <StatusBadge>. Mantiene la
// semántica de color consistente en todas las pantallas (rule 57):
// verde = en curso, celeste = cerca del domicilio, naranja = demora,
// rojo = incidente, gris = estados finales/neutros.
export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export const TRIP_STATUS_TONE: Record<TripStatus, StatusTone> = {
  [TripStatus.SCHEDULED]: 'neutral',
  [TripStatus.ON_THE_WAY]: 'success',
  [TripStatus.NEAR_HOME]: 'info',
  [TripStatus.ARRIVING]: 'info',
  [TripStatus.PICKED_UP]: 'success',
  [TripStatus.IN_TRANSIT]: 'success',
  [TripStatus.NEAR_DESTINATION]: 'info',
  [TripStatus.COMPLETED]: 'neutral',
  [TripStatus.DELAYED]: 'warning',
  [TripStatus.CANCELLED]: 'neutral',
  [TripStatus.INCIDENT]: 'danger',
}

// Estados que cuentan como "traslado en curso" (rule 5). Se comparte entre
// GetDashboardSummaryUseCase y el Dashboard para no definir dos veces qué
// significa "en curso".
export const TRIP_IN_PROGRESS_STATUSES: ReadonlySet<TripStatus> = new Set([
  TripStatus.ON_THE_WAY,
  TripStatus.NEAR_HOME,
  TripStatus.ARRIVING,
  TripStatus.PICKED_UP,
  TripStatus.IN_TRANSIT,
  TripStatus.NEAR_DESTINATION,
])
