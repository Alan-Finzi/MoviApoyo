import { useMemo } from 'react'

import type { Passenger } from '@/domain/entities/Passenger'
import { getPassengerFullName } from '@/domain/entities/Passenger'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useGuardians } from '@/presentation/hooks/useGuardians'
import { usePassengers } from '@/presentation/hooks/usePassengers'
import { formatPhone } from '@/shared/utils/formatPhone'

import styles from './PassengersPage.module.css'
import { SensitiveInfoCell } from './SensitiveInfoCell'

export function PassengersPage() {
  const passengers = usePassengers()
  const guardians = useGuardians()

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

  const columns: readonly TableColumn<Passenger>[] = [
    { key: 'name', header: 'Nombre', render: (passenger) => getPassengerFullName(passenger) },
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
    {
      key: 'sensitive',
      header: 'Información sensible',
      render: (passenger) => <SensitiveInfoCell passengerId={passenger.id} />,
    },
  ]

  return (
    <div>
      <h1 className={styles.title}>Pasajeros</h1>
      <p className={styles.subtitle}>
        La información médica y los documentos no se muestran por defecto: hay que pedirlos
        explícitamente por fila.
      </p>
      {passengers.state.status === 'loading' && <LoadingState message="Cargando pasajeros…" />}
      {passengers.state.status === 'error' && (
        <ErrorState message={passengers.state.message} onRetry={passengers.reload} />
      )}
      {passengers.state.status === 'empty' && (
        <EmptyState title="Todavía no hay pasajeros cargados" />
      )}
      {passengers.state.status === 'success' && (
        <Table
          columns={columns}
          rows={passengers.state.data}
          getRowKey={(passenger) => passenger.id}
        />
      )}
    </div>
  )
}
