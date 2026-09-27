import { useMemo, useState } from 'react'
import type { ChangeEvent } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthProvider'
import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { getDriverFullName } from '@/domain/entities/Driver'
import { getPassengerFullName } from '@/domain/entities/Passenger'
import { TripStatus } from '@/domain/enums/TripStatus'
import { Button } from '@/presentation/components/Button'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { Input } from '@/presentation/components/Input'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { Select } from '@/presentation/components/Select'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useDrivers } from '@/presentation/hooks/useDrivers'
import { usePassengers } from '@/presentation/hooks/usePassengers'
import { useTrips } from '@/presentation/hooks/useTrips'
import { useVehicles } from '@/presentation/hooks/useVehicles'
import { buildTripDetailRoute } from '@/shared/constants/routes.constants'
import { TRIP_STATUS_LABELS } from '@/shared/constants/trip.constants'
import { formatDate, formatTime, getTodayIsoDate, toIsoDate } from '@/shared/utils/date'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { TripForm } from './TripForm'
import styles from './TripsListPage.module.css'

const ALL_STATUSES_VALUE = 'ALL'
const ALL_DATES_VALUE = ''

const STATUS_FILTER_OPTIONS = [
  { value: ALL_STATUSES_VALUE, label: 'Todos los estados' },
  ...Object.values(TripStatus).map((status) => ({
    value: status,
    label: TRIP_STATUS_LABELS[status],
  })),
]

// Un traslado generado junto con otros (recurrenceGroupId desde TripForm, o
// sourceDestinationId desde un PassengerDestination — ver comentarios en
// Trip.ts) se colapsa en una sola fila para no "ocupar lugar en toda la
// lista" (rule pedida) — cada uno sigue siendo un traslado 100%
// independiente, esto es solo una agrupación visual.
type TripRow =
  | { readonly kind: 'single'; readonly trip: TripListItemDto; readonly indent?: boolean }
  | { readonly kind: 'group'; readonly key: string; readonly trips: readonly TripListItemDto[] }

function groupKeyOf(trip: TripListItemDto): string | undefined {
  return trip.recurrenceGroupId ?? trip.sourceDestinationId
}

function buildDisplayRows(
  trips: readonly TripListItemDto[],
  expandedGroups: ReadonlySet<string>,
): readonly TripRow[] {
  const tripsByGroupKey = new Map<string, TripListItemDto[]>()
  for (const trip of trips) {
    const key = groupKeyOf(trip)
    if (!key) continue
    const group = tripsByGroupKey.get(key) ?? []
    group.push(trip)
    tripsByGroupKey.set(key, group)
  }

  const renderedGroupKeys = new Set<string>()
  const rows: TripRow[] = []
  for (const trip of trips) {
    const key = groupKeyOf(trip)
    const group = key ? tripsByGroupKey.get(key) : undefined

    if (key && group && group.length > 1) {
      if (renderedGroupKeys.has(key)) continue
      renderedGroupKeys.add(key)
      rows.push({ kind: 'group', key, trips: group })
      if (expandedGroups.has(key)) {
        for (const groupedTrip of group) rows.push({ kind: 'single', trip: groupedTrip, indent: true })
      }
      continue
    }

    rows.push({ kind: 'single', trip })
  }
  return rows
}

function buildColumns(
  expandedGroups: ReadonlySet<string>,
  onToggleGroup: (key: string) => void,
): readonly TableColumn<TripRow>[] {
  return [
    {
      key: 'child',
      header: 'Paciente',
      render: (row) => {
        if (row.kind === 'single') {
          return (
            <Link
              to={buildTripDetailRoute(row.trip.id)}
              className={row.indent ? styles.indentedCell : undefined}
            >
              {row.indent ? '↳ ' : ''}
              {row.trip.childFullName}
            </Link>
          )
        }
        const isExpanded = expandedGroups.has(row.key)
        return (
          <button type="button" className={styles.groupToggle} onClick={() => onToggleGroup(row.key)}>
            {isExpanded ? (
              <ChevronDown size={14} aria-hidden="true" />
            ) : (
              <ChevronRight size={14} aria-hidden="true" />
            )}
            {row.trips[0]!.childFullName}
            <span className={styles.groupBadge}>×{row.trips.length}</span>
          </button>
        )
      },
    },
    {
      key: 'schedule',
      header: 'Horario',
      render: (row) => {
        if (row.kind === 'single') {
          return `${formatTime(row.trip.scheduledDeparture)} → ${formatTime(row.trip.estimatedArrival)}`
        }
        const first = row.trips[0]!
        const last = row.trips[row.trips.length - 1]!
        return first.scheduledDeparture === last.scheduledDeparture
          ? formatTime(first.scheduledDeparture)
          : `${formatDate(first.scheduledDeparture)} – ${formatDate(last.scheduledDeparture)}, ${formatTime(first.scheduledDeparture)}`
      },
    },
    {
      key: 'origin',
      header: 'Origen',
      render: (row) => (row.kind === 'single' ? row.trip.originLabel : row.trips[0]!.originLabel),
    },
    {
      key: 'destination',
      header: 'Destino',
      render: (row) =>
        row.kind === 'single' ? row.trip.destinationLabel : row.trips[0]!.destinationLabel,
    },
    {
      key: 'driver',
      header: 'Chofer',
      render: (row) => (row.kind === 'single' ? row.trip.driverName : row.trips[0]!.driverName),
    },
    {
      key: 'vehicle',
      header: 'Vehículo',
      render: (row) => (row.kind === 'single' ? row.trip.vehiclePlate : row.trips[0]!.vehiclePlate),
    },
    {
      key: 'status',
      header: 'Estado',
      render: (row) => {
        if (row.kind === 'single') return <StatusBadge status={row.trip.status} />
        const uniqueStatuses = new Set(row.trips.map((trip) => trip.status))
        return uniqueStatuses.size === 1 ? (
          <StatusBadge status={row.trips[0]!.status} />
        ) : (
          'Estados mixtos'
        )
      },
    },
    {
      key: 'delay',
      header: 'Demora',
      render: (row) => {
        if (row.kind !== 'single') return '—'
        return row.trip.delayMinutes > 0 ? `${row.trip.delayMinutes.toString()} min` : '—'
      },
    },
  ]
}

export function TripsListPage() {
  const { user } = useAuth()
  const trips = useTrips()
  const passengers = usePassengers()
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const [statusFilter, setStatusFilter] = useState<string>(ALL_STATUSES_VALUE)
  // Arranca en "hoy" (mismo criterio que ya asumían los datos de ejemplo,
  // rule 26): sin esto, un traslado recurrente que genera varias fechas
  // futuras de una sola vez inundaba la lista con todo lo que hay cargado,
  // no solo lo de hoy (rule pedida: "que no ocupen lugar en toda la lista").
  const [dateFilter, setDateFilter] = useState<string>(getTodayIsoDate())
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)

  const filteredTrips = useMemo(() => {
    if (trips.state.status !== 'success') return []
    return trips.state.data.filter((trip) => {
      if (statusFilter !== ALL_STATUSES_VALUE && trip.status !== statusFilter) return false
      if (dateFilter !== ALL_DATES_VALUE && toIsoDate(trip.scheduledDeparture) !== dateFilter) {
        return false
      }
      return true
    })
  }, [trips.state, statusFilter, dateFilter])

  function toggleGroup(key: string): void {
    setExpandedGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const displayRows = useMemo(
    () => buildDisplayRows(filteredTrips, expandedGroups),
    [filteredTrips, expandedGroups],
  )
  const columns = useMemo(() => buildColumns(expandedGroups, toggleGroup), [expandedGroups])

  function getRowKey(row: TripRow): string {
    return row.kind === 'single' ? row.trip.id : `group-${row.key}`
  }

  const passengerOptions = useMemo(() => {
    if (passengers.state.status !== 'success') return []
    return passengers.state.data.map((passenger) => ({
      value: passenger.id,
      label: getPassengerFullName(passenger),
    }))
  }, [passengers.state])

  const driverOptions = useMemo(() => {
    if (drivers.state.status !== 'success') return []
    return drivers.state.data.map((driver) => ({
      value: driver.id,
      label: getDriverFullName(driver),
    }))
  }, [drivers.state])

  const vehicleOptions = useMemo(() => {
    if (vehicles.state.status !== 'success') return []
    return vehicles.state.data.map((vehicle) => ({
      value: vehicle.id,
      label: `${formatVehiclePlate(vehicle.licensePlate)} — ${vehicle.brand} ${vehicle.model}`,
    }))
  }, [vehicles.state])

  function handleStatusFilterChange(event: ChangeEvent<HTMLSelectElement>): void {
    setStatusFilter(event.target.value)
  }

  function handleDateFilterChange(event: ChangeEvent<HTMLInputElement>): void {
    setDateFilter(event.target.value)
  }

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Traslados</h1>
        <div className={styles.filter}>
          <Input
            label="Filtrar por fecha"
            type="date"
            value={dateFilter}
            onChange={handleDateFilterChange}
          />
        </div>
        {dateFilter !== ALL_DATES_VALUE && (
          <Button variant="ghost" onClick={() => setDateFilter(ALL_DATES_VALUE)}>
            Ver todas las fechas
          </Button>
        )}
        <div className={styles.filter}>
          <Select
            label="Filtrar por estado"
            name="statusFilter"
            value={statusFilter}
            onChange={handleStatusFilterChange}
            options={STATUS_FILTER_OPTIONS}
          />
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Nuevo traslado</Button>
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
        <Table columns={columns} rows={displayRows} getRowKey={getRowKey} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo traslado">
        <TripForm
          passengerOptions={passengerOptions}
          driverOptions={driverOptions}
          vehicleOptions={vehicleOptions}
          registeredBy={user.fullName}
          onRegistered={() => {
            setIsModalOpen(false)
            trips.reload()
          }}
        />
      </Modal>
    </div>
  )
}
