import type { GeoCoordinates } from '@/domain/valueObjects/Address'

export interface RoutePoint extends GeoCoordinates {
  readonly label?: string
}

export interface MapViewData {
  readonly origin: GeoCoordinates
  readonly destination: GeoCoordinates
  readonly vehicleLocation: GeoCoordinates | null
  readonly routePoints: readonly RoutePoint[]
  // Distancia y ETA hacia el próximo punto relevante (domicilio o destino,
  // según en qué tramo está el traslado). null cuando no aplica (ej.
  // traslado todavía no iniciado) — rule 33.
  readonly distanceToNextPointMeters: number | null
  readonly estimatedArrivalMinutes: number | null
}

// Abstracción sobre el proveedor de mapas (rule 4). La UI solo conoce esta
// interfaz: MockMapProvider hoy, LeafletMapProvider/GoogleMapProvider mañana,
// sin cambiar MapContainer ni ninguna pantalla.
export interface MapService {
  getMapViewData(tripId: string): Promise<MapViewData>
}
