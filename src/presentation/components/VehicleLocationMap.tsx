import type { GeoCoordinates } from '@/domain/valueObjects/Address'

import styles from './MapContainer.module.css'

interface VehicleLocationMapProps {
  readonly location: GeoCoordinates
  readonly lastUpdatedLabel: string
}

const VIEW_WIDTH = 320
const VIEW_HEIGHT = 220

// Vista esquemática mínima (mismo enfoque que MapContainer, rule 4/33): un
// solo punto centrado, sin origen/destino/ruta — un vehículo suelto (fuera
// de un traslado activo) no tiene ninguno de esos conceptos, a diferencia
// del mapa del detalle de un traslado.
export function VehicleLocationMap({ location, lastUpdatedLabel }: VehicleLocationMapProps) {
  return (
    <div className={styles.container}>
      <svg
        viewBox={`0 0 ${VIEW_WIDTH.toString()} ${VIEW_HEIGHT.toString()}`}
        role="img"
        aria-label="Ubicación actual del vehículo."
        className={styles.svg}
      >
        <circle cx={VIEW_WIDTH / 2} cy={VIEW_HEIGHT / 2} r={9} className={styles.vehiclePoint} />
        <text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2 - 14} className={styles.pointLabel}>
          Vehículo
        </text>
      </svg>

      <dl className={styles.infoPanel}>
        <div>
          <dt>Latitud</dt>
          <dd>{location.latitude.toFixed(5)}</dd>
        </div>
        <div>
          <dt>Longitud</dt>
          <dd>{location.longitude.toFixed(5)}</dd>
        </div>
        <div>
          <dt>Última actualización</dt>
          <dd>{lastUpdatedLabel}</dd>
        </div>
      </dl>
    </div>
  )
}
