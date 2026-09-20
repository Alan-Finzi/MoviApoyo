import { useMemo } from 'react'

import { getDriverFullName } from '@/domain/entities/Driver'
import type { Vehicle } from '@/domain/entities/Vehicle'
import { Badge } from '@/presentation/components/Badge'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useDrivers } from '@/presentation/hooks/useDrivers'
import { useVehicles } from '@/presentation/hooks/useVehicles'
import { classNames } from '@/shared/utils/classNames'
import {
  LOW_FUEL_THRESHOLD_PERCENTAGE,
  VEHICLE_STATUS_LABELS,
  VEHICLE_STATUS_TONE,
} from '@/shared/constants/vehicle.constants'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import styles from './VehiclesPage.module.css'

export function VehiclesPage() {
  const vehicles = useVehicles()
  const drivers = useDrivers()

  const driverNameById = useMemo(() => {
    if (drivers.state.status !== 'success') return new Map<string, string>()
    return new Map(drivers.state.data.map((driver) => [driver.id, getDriverFullName(driver)]))
  }, [drivers.state])

  const columns: readonly TableColumn<Vehicle>[] = [
    {
      key: 'plate',
      header: 'Patente',
      render: (vehicle) => formatVehiclePlate(vehicle.licensePlate),
    },
    {
      key: 'model',
      header: 'Marca / Modelo',
      render: (vehicle) => `${vehicle.brand} ${vehicle.model} (${vehicle.year.toString()})`,
    },
    {
      key: 'driver',
      header: 'Chofer asignado',
      render: (vehicle) =>
        vehicle.assignedDriverId
          ? (driverNameById.get(vehicle.assignedDriverId) ?? '—')
          : 'Sin asignar',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (vehicle) => (
        <Badge tone={VEHICLE_STATUS_TONE[vehicle.status]}>
          {VEHICLE_STATUS_LABELS[vehicle.status]}
        </Badge>
      ),
    },
    {
      key: 'fuel',
      header: 'Combustible',
      render: (vehicle) => (
        <span
          className={classNames(
            vehicle.fuelLevelPercentage <= LOW_FUEL_THRESHOLD_PERCENTAGE && styles.lowFuel,
          )}
        >
          {vehicle.fuelLevelPercentage}%
        </span>
      ),
    },
    {
      key: 'odometer',
      header: 'Kilometraje',
      render: (vehicle) => `${vehicle.odometerKm.toLocaleString('es-AR')} km`,
    },
  ]

  return (
    <div>
      <h1 className={styles.title}>Vehículos</h1>
      {vehicles.state.status === 'loading' && <LoadingState message="Cargando vehículos…" />}
      {vehicles.state.status === 'error' && (
        <ErrorState message={vehicles.state.message} onRetry={vehicles.reload} />
      )}
      {vehicles.state.status === 'empty' && (
        <EmptyState title="Todavía no hay vehículos cargados" />
      )}
      {vehicles.state.status === 'success' && (
        <Table columns={columns} rows={vehicles.state.data} getRowKey={(vehicle) => vehicle.id} />
      )}
    </div>
  )
}
