import type { MapViewData } from '@/domain/services/MapService'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'

import styles from './MapContainer.module.css'

interface MapContainerProps {
  readonly data: MapViewData
  readonly statusLabel: string
  readonly distanceLabel: string
  readonly etaLabel: string
  readonly lastUpdatedLabel: string
}

const VIEW_WIDTH = 320
const VIEW_HEIGHT = 220
const PADDING = 28

function buildProjector(points: readonly GeoCoordinates[]): (point: GeoCoordinates) => {
  x: number
  y: number
} {
  const lats = points.map((point) => point.latitude)
  const lngs = points.map((point) => point.longitude)
  const minLat = Math.min(...lats)
  const maxLat = Math.max(...lats)
  const minLng = Math.min(...lngs)
  const maxLng = Math.max(...lngs)
  const latRange = maxLat - minLat || 0.001
  const lngRange = maxLng - minLng || 0.001

  return (point) => ({
    x: PADDING + ((point.longitude - minLng) / lngRange) * (VIEW_WIDTH - PADDING * 2),
    // La latitud crece hacia el norte, pero en SVG "y" crece hacia abajo:
    // se invierte para que lo que está más al norte quede más arriba.
    y: PADDING + (1 - (point.latitude - minLat) / latRange) * (VIEW_HEIGHT - PADDING * 2),
  })
}

// Vista esquemática del traslado (rule 4 y 33): no dibuja un mapa
// geográfico real, proyecta origen/destino/vehículo sobre un plano simple.
// El día que se conecte un proveedor real (Leaflet, Google Maps), este
// componente se reemplaza sin tocar MapService ni las pantallas que lo usan.
export function MapContainer({
  data,
  statusLabel,
  distanceLabel,
  etaLabel,
  lastUpdatedLabel,
}: MapContainerProps) {
  const points = [
    data.origin,
    data.destination,
    ...(data.vehicleLocation ? [data.vehicleLocation] : []),
  ]
  const project = buildProjector(points)
  const origin = project(data.origin)
  const destination = project(data.destination)
  const vehicle = data.vehicleLocation ? project(data.vehicleLocation) : null

  return (
    <div className={styles.container}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH.toString()} ${VIEW_HEIGHT.toString()}`}
        role="img"
        aria-label={`Mapa esquemático del traslado. ${statusLabel}.`}
        className={styles.svg}
      >
        <line
          x1={origin.x}
          y1={origin.y}
          x2={destination.x}
          y2={destination.y}
          className={styles.route}
        />

        <circle cx={origin.x} cy={origin.y} r={7} className={styles.originPoint} />
        <text x={origin.x} y={origin.y - 12} className={styles.pointLabel}>
          Domicilio
        </text>

        <circle cx={destination.x} cy={destination.y} r={7} className={styles.destinationPoint} />
        <text x={destination.x} y={destination.y - 12} className={styles.pointLabel}>
          Destino
        </text>

        {vehicle && (
          <>
            <circle cx={vehicle.x} cy={vehicle.y} r={9} className={styles.vehiclePoint} />
            <text x={vehicle.x} y={vehicle.y - 14} className={styles.pointLabel}>
              Vehículo
            </text>
          </>
        )}
      </svg>

      <dl className={styles.infoPanel}>
        <div>
          <dt>Estado</dt>
          <dd>{statusLabel}</dd>
        </div>
        <div>
          <dt>ETA</dt>
          <dd>{etaLabel}</dd>
        </div>
        <div>
          <dt>Distancia</dt>
          <dd>{distanceLabel}</dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd>{lastUpdatedLabel}</dd>
        </div>
      </dl>
    </div>
  )
}
