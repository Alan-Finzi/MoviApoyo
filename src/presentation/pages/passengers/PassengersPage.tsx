import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import type { Passenger } from '@/domain/entities/Passenger'
import { getPassengerFullName } from '@/domain/entities/Passenger'
import { Button } from '@/presentation/components/Button'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useGuardians } from '@/presentation/hooks/useGuardians'
import { usePassengers } from '@/presentation/hooks/usePassengers'
import { buildPassengerDetailRoute } from '@/shared/constants/routes.constants'
import { formatPhone } from '@/shared/utils/formatPhone'

import { PassengerForm } from './PassengerForm'
import styles from './PassengersPage.module.css'

export function PassengersPage() {
  const passengers = usePassengers()
  const guardians = useGuardians()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const guardianById = useMemo(() => {
    if (guardians.state.status !== 'success')
      return new Map<string, { fullName: string; phone: string }>()
    return new Map(
      guardians.state.data.map((guardian) => [
        guardian.id,
        { fullName: guardian.fullName, phone: formatPhone(guardian.phone) },
      ]),
    )
  }, [guardians.state])

  const guardianOptions = useMemo(() => {
    if (guardians.state.status !== 'success') return []
    return guardians.state.data.map((guardian) => ({
      value: guardian.id,
      label: guardian.fullName,
    }))
  }, [guardians.state])

  const columns: readonly TableColumn<Passenger>[] = [
    {
      key: 'name',
      header: 'Nombre',
      render: (passenger) => (
        <Link to={buildPassengerDetailRoute(passenger.id)}>{getPassengerFullName(passenger)}</Link>
      ),
    },
    { key: 'home', header: 'Domicilio', render: (passenger) => passenger.homeAddress.street },
    {
      key: 'destination',
      header: 'Destino',
      render: (passenger) => passenger.destinationAddress.street,
    },
    {
      key: 'guardian',
      header: 'Padre/Tutor',
      render: (passenger) => guardianById.get(passenger.guardianId)?.fullName ?? '—',
    },
    {
      key: 'guardianPhone',
      header: 'Teléfono de contacto',
      render: (passenger) => guardianById.get(passenger.guardianId)?.phone ?? '—',
    },
  ]

  return (
    <div>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pacientes</h1>
          <p className={styles.subtitle}>
            Abrí un paciente para ver su información completa, sus notificaciones y su historial de
            viajes.
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>Nuevo paciente</Button>
      </div>

      {passengers.state.status === 'loading' && <LoadingState message="Cargando pacientes…" />}
      {passengers.state.status === 'error' && (
        <ErrorState message={passengers.state.message} onRetry={passengers.reload} />
      )}
      {passengers.state.status === 'empty' && (
        <EmptyState title="Todavía no hay pacientes cargados" />
      )}
      {passengers.state.status === 'success' && (
        <Table
          columns={columns}
          rows={passengers.state.data}
          getRowKey={(passenger) => passenger.id}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo paciente">
        <PassengerForm
          guardianOptions={guardianOptions}
          onRegistered={() => {
            setIsModalOpen(false)
            passengers.reload()
          }}
        />
      </Modal>
    </div>
  )
}
