import { useEffect, useState } from 'react'
import { AlertTriangle, MapPin, Phone } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthProvider'
import { useCases } from '@/app/providers/dependencies'
import { getDriverFullName } from '@/domain/entities/Driver'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { TripStatus } from '@/domain/enums/TripStatus'
import {
  HAPPY_PATH_TRIP_STATUSES,
  resolveHappyPathStatus,
} from '@/domain/services/TripStatusMachine'
import { Alert } from '@/presentation/components/Alert'
import { Avatar } from '@/presentation/components/Avatar'
import { Button } from '@/presentation/components/Button'
import { Card } from '@/presentation/components/Card'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { MapContainer } from '@/presentation/components/MapContainer'
import { Modal } from '@/presentation/components/Modal'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Timeline, type TimelineItem } from '@/presentation/components/Timeline'
import { useTripDetail } from '@/presentation/hooks/useTripDetail'
import { useTripMapData } from '@/presentation/hooks/useTripMapData'
import { DRIVER_STATUS_LABELS, VEHICLE_STATUS_LABELS } from '@/shared/constants/vehicle.constants'
import { TRIP_STATUS_LABELS } from '@/shared/constants/trip.constants'
import { toAppError } from '@/shared/errors/AppError'
import { formatDateTime, formatTime } from '@/shared/utils/date'
import { formatDistance } from '@/shared/utils/formatDistance'
import { formatPhone } from '@/shared/utils/formatPhone'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { IncidentForm } from '../incidents/IncidentForm'
import styles from './TripDetailPage.module.css'

const CANNOT_REGISTER_INCIDENT_STATUSES: readonly TripStatus[] = [
  TripStatus.COMPLETED,
  TripStatus.CANCELLED,
]

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const tripDetail = useTripDetail(id ?? '')
  const mapData = useTripMapData(id ?? '')

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(() => new Date().toISOString())
  const [sensitiveInfo, setSensitiveInfo] = useState<PassengerSensitiveInfo | null>(null)
  const [isLoadingSensitiveInfo, setIsLoadingSensitiveInfo] = useState(false)

  useEffect(() => {
    if (mapData.state.status === 'success') {
      setLastUpdatedAt(new Date().toISOString())
    }
  }, [mapData.state])

  if (!id) {
    return <ErrorState message="No se indicó qué traslado mostrar." />
  }
  // Nueva const para que TypeScript conserve el chequeo de arriba dentro de
  // los closures definidos más abajo (handleStartTrip); `id` solo, al ser
  // un parámetro de useParams, no queda "angostado" dentro de funciones anidadas.
  const tripId = id

  if (tripDetail.state.status === 'loading') {
    return <LoadingState message="Cargando el traslado…" />
  }
  if (tripDetail.state.status === 'error') {
    return <ErrorState message={tripDetail.state.message} onRetry={tripDetail.reload} />
  }
  if (tripDetail.state.status === 'empty') {
    return <ErrorState message="No se encontró el traslado solicitado." />
  }

  const { trip, passenger, driver, vehicle, guardian } = tripDetail.state.data
  const happyPathStatus = resolveHappyPathStatus(trip)
  const happyPathIndex = HAPPY_PATH_TRIP_STATUSES.indexOf(happyPathStatus)

  const progressItems: TimelineItem[] = HAPPY_PATH_TRIP_STATUSES.map((status, index) => ({
    id: status,
    label: TRIP_STATUS_LABELS[status],
    isCompleted: index <= happyPathIndex,
  }))

  const historyItems: TimelineItem[] = trip.events.map((event) => ({
    id: event.id,
    label: event.description,
    timestamp: formatDateTime(event.timestamp),
    isCompleted: true,
  }))

  async function handleStartTrip(): Promise<void> {
    setStartError(null)
    setIsStarting(true)
    try {
      await useCases.startTrip.execute(tripId)
      tripDetail.reload()
      mapData.reload()
    } catch (error) {
      setStartError(toAppError(error).message)
    } finally {
      setIsStarting(false)
    }
  }

  async function handleShowSensitiveInfo(): Promise<void> {
    if (sensitiveInfo) {
      setSensitiveInfo(null)
      return
    }
    setIsLoadingSensitiveInfo(true)
    try {
      const info = await useCases.getPassengerSensitiveInfo.execute(passenger.id)
      setSensitiveInfo(info)
    } catch {
      // Puede no existir información sensible cargada para el pasajero; no
      // es un error que deba interrumpir la pantalla.
      setSensitiveInfo(null)
    } finally {
      setIsLoadingSensitiveInfo(false)
    }
  }

  function handleIncidentRegistered(): void {
    setIsIncidentModalOpen(false)
    tripDetail.reload()
    mapData.reload()
  }

  const canRegisterIncident = !CANNOT_REGISTER_INCIDENT_STATUSES.includes(trip.status)

  return (
    <div>
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {passenger.firstName} {passenger.lastName}
          <StatusBadge status={trip.status} />
        </div>
        <div className={styles.actions}>
          {trip.status === TripStatus.SCHEDULED && (
            <Button onClick={() => void handleStartTrip()} isLoading={isStarting}>
              Iniciar traslado
            </Button>
          )}
          {canRegisterIncident && (
            <Button variant="secondary" onClick={() => setIsIncidentModalOpen(true)}>
              Registrar incidente
            </Button>
          )}
        </div>
      </div>

      {startError && <Alert tone="danger">{startError}</Alert>}

      {(trip.status === TripStatus.DELAYED || trip.status === TripStatus.INCIDENT) && (
        <Alert tone={trip.status === TripStatus.INCIDENT ? 'danger' : 'warning'}>
          <strong>{TRIP_STATUS_LABELS[trip.status]}.</strong> Nuevo horario estimado de llegada:{' '}
          {formatTime(trip.estimatedArrival)} ({trip.delayMinutes} min de demora acumulada).
        </Alert>
      )}

      <div className={styles.infoGrid}>
        <Card className={styles.infoCard}>
          <Avatar
            fullName={`${passenger.firstName} ${passenger.lastName}`}
            photoUrl={passenger.photoUrl}
          />
          <div className={styles.infoCardBody}>
            <span className={styles.infoCardName}>
              {passenger.firstName} {passenger.lastName}
            </span>
            <span className={styles.infoCardDetail}>
              <MapPin size={13} aria-hidden="true" /> {passenger.homeAddress.street}
            </span>
            <span className={styles.infoCardDetail}>
              Destino: {passenger.destinationAddress.street}
            </span>
            <span className={styles.infoCardDetail}>
              Horario programado: {formatTime(trip.scheduledDeparture)}
            </span>
            <span className={styles.infoCardDetail}>Tutor: {guardian.fullName}</span>

            <Button
              variant="ghost"
              onClick={() => void handleShowSensitiveInfo()}
              isLoading={isLoadingSensitiveInfo}
            >
              {sensitiveInfo ? 'Ocultar información sensible' : 'Ver información sensible'}
            </Button>
            {sensitiveInfo && (
              <div className={styles.sensitiveInfo}>
                {sensitiveInfo.documentNumber && (
                  <span>Documento: {sensitiveInfo.documentNumber}</span>
                )}
                {sensitiveInfo.medicalNotes && (
                  <span>Notas médicas: {sensitiveInfo.medicalNotes}</span>
                )}
                {sensitiveInfo.observations && (
                  <span>Observaciones: {sensitiveInfo.observations}</span>
                )}
              </div>
            )}
          </div>
        </Card>

        <Card className={styles.infoCard}>
          <Avatar fullName={getDriverFullName(driver)} photoUrl={driver.photoUrl} />
          <div className={styles.infoCardBody}>
            <span className={styles.infoCardName}>{getDriverFullName(driver)}</span>
            <span className={styles.infoCardDetail}>
              <Phone size={13} aria-hidden="true" /> {formatPhone(driver.phone)}
            </span>
            <span className={styles.infoCardDetail}>{DRIVER_STATUS_LABELS[driver.status]}</span>
          </div>
        </Card>

        <Card className={styles.infoCard}>
          <div className={styles.infoCardBody}>
            <span className={styles.infoCardName}>{formatVehiclePlate(vehicle.licensePlate)}</span>
            <span className={styles.infoCardDetail}>
              {vehicle.brand} {vehicle.model} ({vehicle.year})
            </span>
            <span className={styles.infoCardDetail}>{VEHICLE_STATUS_LABELS[vehicle.status]}</span>
          </div>
        </Card>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Estado actual</h2>
        <Timeline items={progressItems} />
      </section>

      <div className={styles.twoColumns}>
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Mapa</h2>
          {mapData.state.status === 'loading' && <LoadingState message="Cargando mapa…" />}
          {mapData.state.status === 'error' && (
            <ErrorState message={mapData.state.message} onRetry={mapData.reload} />
          )}
          {mapData.state.status === 'success' && (
            <MapContainer
              data={mapData.state.data}
              statusLabel={TRIP_STATUS_LABELS[trip.status]}
              distanceLabel={
                mapData.state.data.distanceToNextPointMeters !== null
                  ? formatDistance({ meters: mapData.state.data.distanceToNextPointMeters })
                  : '—'
              }
              etaLabel={
                mapData.state.data.estimatedArrivalMinutes !== null
                  ? `${Math.max(1, Math.round(mapData.state.data.estimatedArrivalMinutes)).toString()} min`
                  : '—'
              }
              lastUpdatedLabel={formatTime(lastUpdatedAt)}
            />
          )}
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Historial</h2>
          {historyItems.length > 0 ? (
            <Timeline items={historyItems} />
          ) : (
            <p>
              <AlertTriangle size={14} aria-hidden="true" /> Todavía no hay eventos registrados.
            </p>
          )}
        </section>
      </div>

      <Modal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        title="Registrar incidente"
      >
        <IncidentForm
          tripId={trip.id}
          reportedBy={user.fullName}
          onRegistered={handleIncidentRegistered}
        />
      </Modal>
    </div>
  )
}
