import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Link } from 'react-router-dom'

import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { TripStatus } from '@/domain/enums/TripStatus'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Select } from '@/presentation/components/Select'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useTrips } from '@/presentation/hooks/useTrips'
import { buildTripDetailRoute } from '@/shared/constants/routes.constants'
import { TRIP_STATUS_LABELS } from '@/shared/constants/trip.constants'
import { formatTime } from '@/shared/utils/date'

import styles from './TripsListPage.module.css'

const ALL_STATUSES_VALUE = 'ALL'

const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUSES_VALUE, label: 'Todos los estados' },
  ...Object.values(TripStatus).map((status) => ({
    value: status,
    label: TRIP_STATUS_LABELS[status],
  })),
]

const columns: readonly TableColumn<TripListItemDto>[] = [
  {
    key: 'child',
    header: 'Paciente',
    render: (trip) => <Link to={buildTripDetailRoute(trip.id)}>{trip.childFullName}</Link>,
  },
  {
    key: 'schedule',
    header: 'Horario',
    render: (trip) =>
      `${formatTime(trip.scheduledDeparture)} → ${formatTime(trip.estimatedArrival)}`,
  },
  { key: 'origin', header: 'Origen', render: (trip) => trip.originLabel },
  { key: 'destination', header: 'Destino', render: (trip) => trip.destinationLabel },
  { key: 'driver', header: 'Chofer', render: (trip) => trip.driverName },
  { key: 'vehicle', header: 'Vehículo', render: (trip) => trip.vehiclePlate },
  { key: 'status', header: 'Estado', render: (trip) => <StatusBadge status={trip.status} /> },
  {
    key: 'delay',
    header: 'Demora',
    render: (trip) => (trip.delayMinutes > 0 ? `${trip.delayMinutes.toString()} min` : '—'),
  },
]

export function TripsListPage() {
  const trips = useTrips()
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES_VALUE)

  const filteredTrips = useMemo(() => {
    if (trips.state.status !== 'success') return []
    if (statusFilter === ALL_STATUSES_VALUE) return trips.state.data
    return trips.state.data.filter((trip) => trip.status === statusFilter)
  }, [trips.state, statusFilter])

  function handleStatusFilterChange(event: ChangeEvent<HTMLSelectElement>): void {
    setStatusFilter(event.target.value)
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Traslados</h1>
        <div className={styles.filter}>
          <Select
            label="Filtrar por estado"
            name="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
      </div>

      {trips.state.status === 'loading' && <LoadingState message="Cargando traslados…" />}
      {trips.state.status === 'error' && (
        <ErrorState message={trips.state.message} onRetry={trips.reload} />
      )}
      {trips.state.status === 'empty' && <EmptyState title="Todavía no hay traslados cargados" />}
      {trips.state.status === 'success' && filteredTrips.length === 0 && (
        <EmptyState title="Ningún traslado coincide con el filtro seleccionado" />
      )}
      {trips.state.status === 'success' && filteredTrips.length > 0 && (
        <Table columns={columns} rows={filteredTrips} getRowKey={(trip) => trip.id} />
      )}
    </div>
  )
}
