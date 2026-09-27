import { useState } from 'react'
import { useParams } from 'react-router-dom'

import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import type { GenerateRecurringTripsResult } from '@/application/useCases/GenerateRecurringTripsUseCase'
import { getDriverFullName } from '@/domain/entities/Driver'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { PassengerStatus } from '@/domain/enums/PassengerStatus'
import { useAuth } from '@/app/providers/AuthProvider'
import { useCases } from '@/app/providers/dependencies'
import { Alert } from '@/presentation/components/Alert'
import { Avatar } from '@/presentation/components/Avatar'
import { Badge } from '@/presentation/components/Badge'
import { Button } from '@/presentation/components/Button'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { Modal } from '@/presentation/components/Modal'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Table, type TableColumn } from '@/presentation/components/Table'
import { Tabs } from '@/presentation/components/Tabs'
import { useDrivers } from '@/presentation/hooks/useDrivers'
import { useGuardians } from '@/presentation/hooks/useGuardians'
import { useNotificationsByPassenger } from '@/presentation/hooks/useNotificationsByPassenger'
import { usePassenger } from '@/presentation/hooks/usePassenger'
import { usePassengerDestinations } from '@/presentation/hooks/usePassengerDestinations'
import { useScheduleRecommendation } from '@/presentation/hooks/useScheduleRecommendation'
import { useTripsByPassenger } from '@/presentation/hooks/useTripsByPassenger'
import { useVehicles } from '@/presentation/hooks/useVehicles'
import {
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONE,
} from '@/shared/constants/notification.constants'
import {
  PASSENGER_SEX_LABELS,
  PASSENGER_STATUS_LABELS,
} from '@/shared/constants/passenger.constants'
import { formatDateTime, formatTime } from '@/shared/utils/date'
import { formatDestinationSchedule } from '@/shared/utils/formatDestinationSchedule'
import { formatPhone } from '@/shared/utils/formatPhone'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { GenerateRecurringTripsForm } from './GenerateRecurringTripsForm'
import { PassengerDestinationForm } from './PassengerDestinationForm'
import styles from './PassengerDetailPage.module.css'
import { PassengerSensitiveInfoForm } from './PassengerSensitiveInfoForm'

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

function DestinationsTab({ passengerId }: { readonly passengerId: string }) {
  const { user } = useAuth()
  const destinations = usePassengerDestinations(passengerId)
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [generatingForId, setGeneratingForId] = useState<string | null>(null)
  const [generationResult, setGenerationResult] = useState<GenerateRecurringTripsResult | null>(
    null,
  )

  const driverOptions =
    drivers.state.status === 'success'
      ? drivers.state.data.map((item) => ({ value: item.id, label: getDriverFullName(item) }))
      : []
  const vehicleOptions =
    vehicles.state.status === 'success'
      ? vehicles.state.data.map((item) => ({
          value: item.id,
          label: `${formatVehiclePlate(item.licensePlate)} — ${item.brand} ${item.model}`,
        }))
      : []

  return (
    <div>
      <div className={styles.destinationsHeader}>
        <p className={styles.infoLabel}>
          Además del domicilio y destino principal, un paciente puede tener otros destinos
          habituales (ej. kinesiología, un turno médico puntual) con su propio horario.
        </p>
        <Button onClick={() => setIsModalOpen(true)}>Nuevo destino</Button>
      </div>

      {generationResult && (
        <Alert tone={generationResult.warnings.length > 0 ? 'warning' : 'success'}>
          Se generaron {generationResult.trips.length} viaje
          {generationResult.trips.length === 1 ? '' : 's'}.
          {generationResult.warnings.length > 0 && (
            <>
              {' '}
              {generationResult.warnings.length} con conflicto de agenda (quedó igual registrado,
              revisalo en el detalle de cada viaje).
            </>
          )}
        </Alert>
      )}

      {destinations.state.status === 'loading' && <LoadingState message="Cargando destinos…" />}
      {destinations.state.status === 'error' && (
        <ErrorState message={destinations.state.message} onRetry={destinations.reload} />
      )}
      {destinations.state.status === 'empty' && (
        <EmptyState title="Todavía no hay destinos adicionales cargados" />
      )}
      {destinations.state.status === 'success' && (
        <div className={styles.notificationList}>
          {destinations.state.data.map((destination) => (
            <Card key={destination.id} className={styles.notificationItem}>
              <div>
                <p className={styles.destinationLabel}>{destination.label}</p>
                <span className={styles.infoLabel}>{destination.address.street}</span>
              </div>
              <Badge tone="info">{formatDestinationSchedule(destination)}</Badge>
              <Button variant="ghost" onClick={() => setGeneratingForId(destination.id)}>
                Generar viajes
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Nuevo destino">
        <PassengerDestinationForm
          passengerId={passengerId}
          onRegistered={() => {
            setIsModalOpen(false)
            destinations.reload()
          }}
        />
      </Modal>

      <Modal
        isOpen={generatingForId !== null}
        onClose={() => setGeneratingForId(null)}
        title="Generar viajes recurrentes"
      >
        {generatingForId && (
          <GenerateRecurringTripsForm
            passengerId={passengerId}
            destinationId={generatingForId}
            driverOptions={driverOptions}
            vehicleOptions={vehicleOptions}
            registeredBy={user.fullName}
            onGenerated={(result) => {
              setGeneratingForId(null)
              setGenerationResult(result)
            }}
          />
        )}
      </Modal>
    </div>
  )
}

// "yyyy-mm-dd" es una fecha de calendario pura, sin hora ni zona horaria —
// formatearla a mano evita que el corrimiento UTC-3 la muestre un día antes
// (mismo criterio que formatDestinationSchedule.ts).
function formatBirthDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function PassengerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const passenger = usePassenger(id ?? '')
  const guardians = useGuardians()
  const [sensitiveInfo, setSensitiveInfo] = useState<PassengerSensitiveInfo | null>(null)
  const [isLoadingSensitive, setIsLoadingSensitive] = useState(false)
  const [isEditingSensitive, setIsEditingSensitive] = useState(false)

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
      // No hay información sensible cargada todavía: se abre igual el panel
      // (vacío) para que "Cargar información sensible" quede visible.
      setSensitiveInfo({ passengerId })
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
          <span className={styles.infoLabel}>Estado</span>
          <Badge tone={data.status === PassengerStatus.ACTIVE ? 'success' : 'neutral'}>
            {PASSENGER_STATUS_LABELS[data.status]}
          </Badge>
        </div>
        {data.birthDate && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Fecha de nacimiento</span>
            <span>{formatBirthDate(data.birthDate)}</span>
          </div>
        )}
        {data.sex && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Sexo</span>
            <span>{PASSENGER_SEX_LABELS[data.sex]}</span>
          </div>
        )}
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
        {data.operationalNotes && (
          <div className={styles.infoRow}>
            <span className={styles.infoLabel}>Observaciones operativas</span>
            <span>{data.operationalNotes}</span>
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
            {sensitiveInfo.bloodType && <span>Grupo sanguíneo: {sensitiveInfo.bloodType}</span>}
            {sensitiveInfo.allergies && sensitiveInfo.allergies.length > 0 && (
              <span>Alergias: {sensitiveInfo.allergies.join(', ')}</span>
            )}
            {sensitiveInfo.medicalNotes && <span>Notas médicas: {sensitiveInfo.medicalNotes}</span>}
            {sensitiveInfo.observations && <span>Observaciones: {sensitiveInfo.observations}</span>}
            <Button variant="ghost" onClick={() => setIsEditingSensitive(true)}>
              Editar información sensible
            </Button>
          </div>
        )}
      </Card>

      <Modal
        isOpen={isEditingSensitive}
        onClose={() => setIsEditingSensitive(false)}
        title="Información sensible"
      >
        <PassengerSensitiveInfoForm
          passengerId={passengerId}
          initialValues={sensitiveInfo}
          onSaved={(info) => {
            setSensitiveInfo(info)
            setIsEditingSensitive(false)
          }}
        />
      </Modal>

      <Tabs
        tabs={[
          { id: 'trips', label: 'Viajes', content: <TripsTab passengerId={passengerId} /> },
          {
            id: 'destinations',
            label: 'Destinos',
            content: <DestinationsTab passengerId={passengerId} />,
          },
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
