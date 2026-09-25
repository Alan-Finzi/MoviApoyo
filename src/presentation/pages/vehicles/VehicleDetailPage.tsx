import { useParams, Link } from 'react-router-dom'

import { getDriverFullName } from '@/domain/entities/Driver'
import { Badge } from '@/presentation/components/Badge'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { VehicleLocationMap } from '@/presentation/components/VehicleLocationMap'
import { useDriver } from '@/presentation/hooks/useDriver'
import { useVehicle } from '@/presentation/hooks/useVehicle'
import { useVehicleLocation } from '@/presentation/hooks/useVehicleLocation'
import { buildDriverDetailRoute } from '@/shared/constants/routes.constants'
import {
  LOW_FUEL_THRESHOLD_PERCENTAGE,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONE,
} from '@/shared/constants/vehicle.constants'
import { formatTime } from '@/shared/utils/date'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import styles from './VehicleDetailPage.module.css'

function AssignedDriver({ driverId }: { readonly driverId: string }) {
  const driver = useDriver(driverId)

  if (driver.state.status === 'loading') return <LoadingState message="Cargando chofer…" />
  if (driver.state.status === 'error' || driver.state.status === 'empty') return null

  const data = driver.state.data
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>Chofer asignado</span>
      <Link to={buildDriverDetailRoute(data.id)}>{getDriverFullName(data)}</Link>
    </div>
  )
}

function VehicleLocationSection({ vehicleId }: { readonly vehicleId: string }) {
  const vehicleLocation = useVehicleLocation(vehicleId)

  if (vehicleLocation.state.status === 'loading') {
    return <LoadingState message="Buscando ubicación…" />
  }
  if (vehicleLocation.state.status === 'error') {
    return <ErrorState message={vehicleLocation.state.message} onRetry={vehicleLocation.reload} />
  }
  if (vehicleLocation.state.status === 'empty') {
    return (
      <EmptyState
        title="Sin ubicación disponible"
        description="El vehículo no tiene un traslado activo con GPS en este momento."
      />
    )
  }

  return vehicleLocation.state.data ? (
    <VehicleLocationMap
      location={vehicleLocation.state.data}
      lastUpdatedLabel={formatTime(new Date().toISOString())}
    />
  ) : null
}

export function VehicleDetailPage() {
  const { id } = useParams<{ id: string }>()
  const vehicle = useVehicle(id ?? '')

  if (!id) return <ErrorState message="No se indicó qué vehículo mostrar." />

  if (vehicle.state.status === 'loading') return <LoadingState message="Cargando vehículo…" />
  if (vehicle.state.status === 'error') {
    return <ErrorState message={vehicle.state.message} onRetry={vehicle.reload} />
  }
  if (vehicle.state.status === 'empty') {
    return <ErrorState message="No se encontró el vehículo solicitado." />
  }

  const data = vehicle.state.data

  return (
    <div>
      <div className={styles.header}>
        <p className={styles.name}>{formatVehiclePlate(data.licensePlate)}</p>
        <p className={styles.subtitle}>
          {data.brand} {data.model} ({data.year})
        </p>
      </div>

      <Card className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Estado</span>
          <Badge tone={VEHICLE_STATUS_TONE[data.status]}>
            {VEHICLE_STATUS_LABELS[data.status]}
          </Badge>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Combustible</span>
          <span>{data.fuelLevelPercentage}%</span>
          {data.fuelLevelPercentage <= LOW_FUEL_THRESHOLD_PERCENTAGE && (
            <Badge tone="danger">Bajo</Badge>
          )}
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Kilometraje</span>
          <span>{data.odometerKm.toLocaleString('es-AR')} km</span>
        </div>
        {data.notes && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Notas</span>
            <span>{data.notes}</span>
          </div>
        )}
        {data.assignedDriverId && <AssignedDriver driverId={data.assignedDriverId} />}
      </Card>

      <h2 className={styles.sectionTitle}>Ubicación</h2>
      <VehicleLocationSection vehicleId={id} />
    </div>
  )
}
