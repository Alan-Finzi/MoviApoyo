import { useState } from 'react'
import { useParams } from 'react-router-dom'

import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { useCases } from '@/app/providers/dependencies'
import { Avatar } from '@/presentation/components/Avatar'
import { Badge } from '@/presentation/components/Badge'
import { Button } from '@/presentation/components/Button'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { Tabs } from '@/presentation/components/Tabs'
import { useGuardians } from '@/presentation/hooks/useGuardians'
import { useNotificationsByPassenger } from '@/presentation/hooks/useNotificationsByPassenger'
import { usePassenger } from '@/presentation/hooks/usePassenger'
import { useScheduleRecommendation } from '@/presentation/hooks/useScheduleRecommendation'
import { useTripsByPassenger } from '@/presentation/hooks/useTripsByPassenger'
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONE,
} from '@/shared/constants/notification.constants'
import { formatDateTime, formatTime } from '@/shared/utils/date'
import { formatPhone } from '@/shared/utils/formatPhone'

import styles from './PassengerDetailPage.module.css'

const TRIP_COLUMNS: readonly TableColumn<TripListItemDto>[] = [
  {
    key: 'schedule',
    header: 'Horario',
    render: (trip) =>
      `${formatTime(trip.scheduledDeparture)} → ${formatTime(trip.estimatedArrival)}`,
  },
  { key: 'driver', header: 'Chofer', render: (trip) => trip.driverName },
  { key: 'vehicle', header: 'Vehículo', render: (trip) => trip.vehiclePlate },
  { key: 'status', header: 'Estado', render: (trip) => <StatusBadge status={trip.status} /> },
]

function TripsTab({ passengerId }: { readonly passengerId: string }) {
  const trips = useTripsByPassenger(passengerId)

  if (trips.state.status === 'loading') return <LoadingState message="Cargando viajes…" />
  if (trips.state.status === 'error') {
    return <ErrorState message={trips.state.message} onRetry={trips.reload} />
  }
  if (trips.state.status === 'empty') {
    return <EmptyState title="Este paciente todavía no tiene viajes registrados" />
  }
  return <Table columns={TRIP_COLUMNS} rows={trips.state.data} getRowKey={(trip) => trip.id} />
}

function NotificationsTab({ passengerId }: { readonly passengerId: string }) {
  const notifications = useNotificationsByPassenger(passengerId)

  if (notifications.state.status === 'loading') {
    return <LoadingState message="Cargando notificaciones…" />
  }
  if (notifications.state.status === 'error') {
    return <ErrorState message={notifications.state.message} onRetry={notifications.reload} />
  }
  if (notifications.state.status === 'empty') {
    return <EmptyState title="Todavía no se envió ninguna notificación para este paciente" />
  }
  return (
    <div className={styles.notificationList}>
      {notifications.state.data.map((notification) => (
        <Card key={notification.id} className={styles.notificationItem}>
          <div>
            <p>{notification.message}</p>
            <span className={styles.infoLabel}>{formatDateTime(notification.createdAt)}</span>
          </div>
          <Badge tone={NOTIFICATION_TYPE_TONE[notification.type]}>
            {NOTIFICATION_TYPE_LABELS[notification.type]}
          </Badge>
        </Card>
      ))}
    </div>
  )
}

function ScheduleTab({ passengerId }: { readonly passengerId: string }) {
  const recommendation = useScheduleRecommendation(passengerId)

  if (recommendation.state.status === 'loading') {
    return <LoadingState message="Analizando el historial de viajes…" />
  }
  if (recommendation.state.status === 'error') {
    return <ErrorState message={recommendation.state.message} onRetry={recommendation.reload} />
  }
  // ScheduleRecommendationDto es siempre un objeto (nunca [] ni null), así
  // que 'empty' no debería ocurrir en la práctica — se cubre igual porque
  // AsyncState<T> siempre incluye ese estado en el tipo.
  if (recommendation.state.status !== 'success') return null

  const data = recommendation.state.data
  return (
    <Card className={styles.infoCard}>
      <p>{data.recommendationMessage}</p>
      {data.sampleSize > 0 && (
        <p className={styles.infoLabel}>
          Basado en {data.sampleSize} viaje{data.sampleSize === 1 ? '' : 's'} finalizado
          {data.sampleSize === 1 ? '' : 's'}.
        </p>
      )}
    </Card>
  )
}

export function PassengerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const passenger = usePassenger(id ?? '')
  const guardians = useGuardians()
  const [sensitiveInfo, setSensitiveInfo] = useState<PassengerSensitiveInfo | null>(null)
  const [isLoadingSensitive, setIsLoadingSensitive] = useState(false)

  if (!id) return <ErrorState message="No se indicó qué paciente mostrar." />
  const passengerId = id

  async function handleToggleSensitive(): Promise<void> {
    if (sensitiveInfo) {
      setSensitiveInfo(null)
      return
    }
    setIsLoadingSensitive(true)
    try {
      const info = await useCases.getPassengerSensitiveInfo.execute(passengerId)
      setSensitiveInfo(info)
    } catch {
      setSensitiveInfo(null)
    } finally {
      setIsLoadingSensitive(false)
    }
  }

  if (passenger.state.status === 'loading') return <LoadingState message="Cargando paciente…" />
  if (passenger.state.status === 'error') {
    return <ErrorState message={passenger.state.message} onRetry={passenger.reload} />
  }
  if (passenger.state.status === 'empty') {
    return <ErrorState message="No se encontró el paciente solicitado." />
  }

  const data = passenger.state.data
  const guardian =
    guardians.state.status === 'success'
      ? guardians.state.data.find((item) => item.id === data.guardianId)
      : undefined

  return (
    <div>
      <div className={styles.header}>
        <Avatar
          fullName={`${data.firstName} ${data.lastName}`}
          photoUrl={data.photoUrl}
          size="lg"
        />
        <div>
          <p className={styles.name}>
            {data.firstName} {data.lastName}
          </p>
          <p className={styles.subtitle}>Ficha del paciente</p>
        </div>
      </div>

      <Card className={styles.infoCard}>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Domicilio</span>
          <span>{data.homeAddress.street}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Destino</span>
          <span>{data.destinationAddress.street}</span>
        </div>
        <div className={styles.infoRow}>
          <span className={styles.infoLabel}>Padre/Tutor</span>
          <span>{guardian?.fullName ?? '—'}</span>
        </div>
        {guardian && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Teléfono de contacto</span>
            <span>{formatPhone(guardian.phone)}</span>
          </div>
        )}

        <Button
          variant="ghost"
          onClick={() => void handleToggleSensitive()}
          isLoading={isLoadingSensitive}
        >
          {sensitiveInfo ? 'Ocultar información sensible' : 'Ver información sensible'}
        </Button>
        {sensitiveInfo && (
          <div className={styles.sensitiveInfo}>
            {sensitiveInfo.documentNumber && <span>Documento: {sensitiveInfo.documentNumber}</span>}
            {sensitiveInfo.medicalNotes && <span>Notas médicas: {sensitiveInfo.medicalNotes}</span>}
            {sensitiveInfo.observations && <span>Observaciones: {sensitiveInfo.observations}</span>}
          </div>
        )}
      </Card>

      <Tabs
        tabs={[
          { id: 'trips', label: 'Viajes', content: <TripsTab passengerId={passengerId} /> },
          {
            id: 'notifications',
            label: 'Notificaciones',
            content: <NotificationsTab passengerId={passengerId} />,
          },
          {
            id: 'schedule',
            label: 'Horarios sugeridos',
            content: <ScheduleTab passengerId={passengerId} />,
          },
        ]}
      />
    </div>
  )
}
