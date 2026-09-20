import type { TripStatus } from '@/domain/enums/TripStatus'
import { TRIP_STATUS_LABELS, TRIP_STATUS_TONE } from '@/shared/constants/trip.constants'

import { Badge } from './Badge'

interface StatusBadgeProps {
  readonly status: TripStatus
}

// Envuelve <Badge> resolviendo automáticamente color y texto a partir del
// estado del traslado, para no repetir ese mapeo en cada pantalla.
export function StatusBadge({ status }: StatusBadgeProps) {
  return <Badge tone={TRIP_STATUS_TONE[status]}>{TRIP_STATUS_LABELS[status]}</Badge>
}
