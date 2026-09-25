import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Driver } from '@/domain/entities/Driver'
import { getDriverFullName } from '@/domain/entities/Driver'
import { Avatar } from '@/presentation/components/Avatar'
import { Badge } from '@/presentation/components/Badge'
import { Button } from '@/presentation/components/Button'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useDrivers } from '@/presentation/hooks/useDrivers'
import { useTrips } from '@/presentation/hooks/useTrips'
import { useVehicles } from '@/presentation/hooks/useVehicles'
import { buildDriverDetailRoute } from '@/shared/constants/routes.constants'
import { DRIVER_STATUS_LABELS, DRIVER_STATUS_TONE } from '@/shared/constants/vehicle.constants'
import { formatPhone } from '@/shared/utils/formatPhone'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { DriverForm } from './DriverForm'
import styles from './DriversPage.module.css'

export function DriversPage() {
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const trips = useTrips()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const vehicleOptions = useMemo(() => {
    if (vehicles.state.status !== 'success') return []
    return vehicles.state.data.map((vehicle) => ({
      value: vehicle.id,
      label: `${formatVehiclePlate(vehicle.licensePlate)} — ${vehicle.brand} ${vehicle.model}`,
    }))
  }, [vehicles.state])

  const vehiclePlateById = useMemo(() => {
    if (vehicles.state.status !== 'success') return new Map<string, string>()
    return new Map(
      vehicles.state.data.map((vehicle) => [vehicle.id, formatVehiclePlate(vehicle.licensePlate)]),
    )
  }, [vehicles.state])

  // Simplificación del mock (rule 26): todos los traslados semilla son "de
  // hoy", así que contar el total de traslados por chofer equivale a
  // contar los del día. Con backend real, esto se filtraría por fecha.
  const tripsTodayByDriverId = useMemo(() => {
    const counts = new Map<string, number>()
    if (trips.state.status === 'success') {
      for (const trip of trips.state.data) {
        counts.set(trip.driverId, (counts.get(trip.driverId) ?? 0) + 1)
      }
    }
    return counts
  }, [trips.state])

  const columns: readonly TableColumn<Driver>[] = [
    {
      key: 'name',
      header: 'Chofer',
      render: (driver) => (
        <Link to={buildDriverDetailRoute(driver.id)} className={styles.driverCell}>
          <Avatar fullName={getDriverFullName(driver)} photoUrl={driver.photoUrl} size="sm" />
          {getDriverFullName(driver)}
        </Link>
      ),
    },
    { key: 'phone', header: 'Teléfono', render: (driver) => formatPhone(driver.phone) },
    {
      key: 'vehicle',
      header: 'Vehículo asignado',
      render: (driver) =>
        driver.assignedVehicleId ? (vehiclePlateById.get(driver.assignedVehicleId) ?? '—') : '—',
    },
    {
      key: 'status',
      header: 'Estado',
      render: (driver) => (
        <Badge tone={DRIVER_STATUS_TONE[driver.status]}>
          {DRIVER_STATUS_LABELS[driver.status]}
        </Badge>
      ),
    },
    {
      key: 'tripsToday',
      header: 'Viajes hoy',
      render: (driver) => (tripsTodayByDriverId.get(driver.id) ?? 0).toString(),
    },
  ]

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Choferes</h1>
        <Button onClick={() => setIsModalOpen(true)}>Nuevo chofer</Button>
      </div>

      {drivers.state.status === 'loading' && <LoadingState message="Cargando choferes…" />}
      {drivers.state.status === 'error' && (
        <ErrorState message={drivers.state.message} onRetry={drivers.reload} />
      )}
      {drivers.state.status === 'empty' && <EmptyState title="Todavía no hay choferes cargados" />}
      {drivers.state.status === 'success' && (
        <Table columns={columns} rows={drivers.state.data} getRowKey={(driver) => driver.id} />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo chofer">
        <DriverForm
          vehicleOptions={vehicleOptions}
          onRegistered={() => {
            setIsModalOpen(false)
            drivers.reload()
          }}
        />
      </Modal>
    </div>
  )
}
