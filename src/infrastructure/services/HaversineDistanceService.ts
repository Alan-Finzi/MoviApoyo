import type { DistanceService } from '@/domain/services/DistanceService'
import { createDistance, type Distance } from '@/domain/valueObjects/Distance'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'

const EARTH_RADIUS_METERS = 6_371_000

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

// Implementación real (no un mock): la fórmula de Haversine calcula la
// distancia entre dos coordenadas geográficas sin importar de dónde salen
// esas coordenadas (GPS real o simulado). Por eso no necesita reemplazo
// futuro como sí lo necesitan NotificationService o MapService.
export class HaversineDistanceService implements DistanceService {
  calculateDistance(from: GeoCoordinates, to: GeoCoordinates): Distance {
    const dLat = toRadians(to.latitude - from.latitude)
    const dLng = toRadians(to.longitude - from.longitude)
    const lat1 = toRadians(from.latitude)
    const lat2 = toRadians(to.latitude)

    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
    const centralAngle = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return createDistance(EARTH_RADIUS_METERS * centralAngle)
  }

  estimateArrivalMinutes(distance: Distance, averageSpeedKmh: number): number {
    if (averageSpeedKmh <= 0) return 0
    const speedMetersPerMinute = (averageSpeedKmh * 1000) / 60
    return distance.meters / speedMetersPerMinute
  }
}
