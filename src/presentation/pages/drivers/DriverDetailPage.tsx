import { useParams } from 'react-router-dom'

import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { getDriverFullName } from '@/domain/entities/Driver'
import { Avatar } from '@/presentation/components/Avatar'
import { Badge } from '@/presentation/components/Badge'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useDriver } from '@/presentation/hooks/useDriver'
import { useTripsByDriver } from '@/presentation/hooks/useTripsByDriver'
import { useVehicle } from '@/presentation/hooks/useVehicle'
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_TONE } from '@/shared/constants/vehicle.constants'
import { formatPhone } from '@/shared/utils/formatPhone'
import { formatTime } from '@/shared/utils/date'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import styles from './DriverDetailPage.module.css'

const TRIP_COLUMNS: readonly TableColumn<TripListItemDto>[] = [
  { key: 'child', header: 'Paciente', render: (trip) => trip.childFullName },
  {
    key: 'schedule',
    header: 'Horario',
    render: (trip) =>
      `${formatTime(trip.scheduledDeparture)} → ${formatTime(trip.estimatedArrival)}`,
  },
  { key: 'status', header: 'Estado', render: (trip) => <StatusBadge status={trip.status} /> },
]

function DriverTrips({ driverId }: { readonly driverId: string }) {
  const trips = useTripsByDriver(driverId)

  if (trips.state.status === 'loading') return <LoadingState message="Cargando viajes…" />
  if (trips.state.status === 'error') {
    return <ErrorState message={trips.state.message} onRetry={trips.reload} />
  }
  if (trips.state.status === 'empty') {
    return <EmptyState title="Este chofer todavía no tiene viajes registrados" />
  }
  return <Table columns={TRIP_COLUMNS} rows={trips.state.data} getRowKey={(trip) => trip.id} />
}

function AssignedVehicle({ vehicleId }: { readonly vehicleId: string }) {
  const vehicle = useVehicle(vehicleId)

  if (vehicle.state.status === 'loading') return <LoadingState message="Cargando vehículo…" />
  if (vehicle.state.status === 'error' || vehicle.state.status === 'empty') return null

  const data = vehicle.state.data
  return (
    <div className={styles.infoRow}>
      <span className={styles.infoLabel}>Vehículo asignado</span>
      <span>
        {formatVehiclePlate(data.licensePlate)} — {data.brand} {data.model}
      </span>
    </div>
  )
}

export function DriverDetailPage() {
  const { id } = useParams<{ id: string }>()
  const driver = useDriver(id ?? '')

  if (!id) return <ErrorState message="No se indicó qué chofer mostrar." />

  if (driver.state.status === 'loading') return <LoadingState message="Cargando chofer…" />
  if (driver.state.status === 'error') {
    return <ErrorState message={driver.state.message} onRetry={driver.reload} />
  }
  if (driver.state.status === 'empty') {
    return <ErrorState message="No se encontró el chofer solicitado." />
  }

  const data = driver.state.data

  return (
    <div>
      <div className={styles.header}>
        <Avatar fullName={getDriverFullName(data)} photoUrl={data.photoUrl} size="lg" />
        <div>
          <p className={styles.name}>{getDriverFullName(data)}</p>
          <p className={styles.subtitle}>Ficha del chofer</p>
        </div>
      </div>

      <Card className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Teléfono</span>
          <span>{formatPhone(data.phone)}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Estado</span>
          <Badge tone={DRIVER_STATUS_TONE[data.status]}>{DRIVER_STATUS_LABELS[data.status]}</Badge>
        </div>
        {data.assignedVehicleId && <AssignedVehicle vehicleId={data.assignedVehicleId} />}
      </Card>

      <h2 className={styles.sectionTitle}>Viajes</h2>
      <DriverTrips driverId={id} />
    </div>
  )
}
