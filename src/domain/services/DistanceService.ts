import type { GeoCoordinates } from '@/domain/valueObjects/Address'
import type { Distance } from '@/domain/valueObjects/Distance'

// Calcula distancias y tiempos estimados entre puntos geográficos (rule 45).
// La implementación Mock puede simular movimiento; una implementación real
// futura usará coordenadas GPS reales del vehículo.
export interface DistanceService {
  calculateDistance(from: GeoCoordinates, to: GeoCoordinates): Distance
  estimateArrivalMinutes(distance: Distance, averageSpeedKmh: number): number
}
