import { useMemo, useState } from 'react'

import { useAuth } from '@/app/providers/AuthProvider'
import type { Incident } from '@/domain/entities/Incident'
import { Button } from '@/presentation/components/Button'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { useIncidents } from '@/presentation/hooks/useIncidents'
import { useTrips } from '@/presentation/hooks/useTrips'
import { INCIDENT_TYPE_LABELS } from '@/shared/constants/notification.constants'
import { formatDateTime, formatTime } from '@/shared/utils/date'

import { IncidentForm } from './IncidentForm'
import styles from './IncidentsPage.module.css'

export function IncidentsPage() {
  const incidents = useIncidents()
  const trips = useTrips()
  const { user } = useAuth()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const tripOptions = useMemo(() => {
    if (trips.state.status !== 'success') return []
    return trips.state.data.map((trip) => ({
      value: trip.id,
      label: `${trip.childFullName} — ${formatTime(trip.scheduledDeparture)}`,
    }))
  }, [trips.state])

  const columns: readonly TableColumn<Incident>[] = [
    { key: 'timestamp', header: 'Fecha', render: (incident) => formatDateTime(incident.timestamp) },
    { key: 'type', header: 'Tipo', render: (incident) => INCIDENT_TYPE_LABELS[incident.type] },
    { key: 'description', header: 'Descripción', render: (incident) => incident.description },
    {
      key: 'delay',
      header: 'Demora estimada',
      render: (incident) => `${incident.estimatedDelayMinutes.toString()} min`,
    },
    { key: 'reportedBy', header: 'Reportado por', render: (incident) => incident.reportedBy },
  ]

  return (
    <div>
      <div className={styles.header}>
        <h1 className={styles.title}>Incidentes</h1>
        <Button onClick={() => setIsModalOpen(true)}>Registrar incidente</Button>
      </div>

      {incidents.state.status === 'loading' && <LoadingState message="Cargando incidentes…" />}
      {incidents.state.status === 'error' && (
        <ErrorState message={incidents.state.message} onRetry={incidents.reload} />
      )}
      {incidents.state.status === 'empty' && (
        <EmptyState
          title="No hay incidentes registrados"
          description="Buena señal: todo viene funcionando sin inconvenientes."
        />
      )}
      {incidents.state.status === 'success' && (
        <Table
          columns={columns}
          rows={incidents.state.data}
          getRowKey={(incident) => incident.id}
        />
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Registrar incidente">
        <IncidentForm
          tripOptions={tripOptions}
          reportedBy={user.fullName}
          onRegistered={() => {
            setIsModalOpen(false)
            incidents.reload()
          }}
        />
      </Modal>
    </div>
  )
}
