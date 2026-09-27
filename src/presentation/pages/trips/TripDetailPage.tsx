import { useEffect, useState } from 'react'
import { AlertTriangle, MapPin, Phone } from 'lucide-react'
import { useParams } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthProvider'
import { useCases } from '@/app/providers/dependencies'
import { getDriverFullName } from '@/domain/entities/Driver'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { TripEventType } from '@/domain/entities/TripEvent'
import { TripStatus } from '@/domain/enums/TripStatus'
import {
  HAPPY_PATH_TRIP_STATUSES,
  isTerminalTripStatus,
  resolveHappyPathStatus,
} from '@/domain/services/TripStatusMachine'
import { Alert } from '@/presentation/components/Alert'
import { Avatar } from '@/presentation/components/Avatar'
import { Badge } from '@/presentation/components/Badge'
import { Button } from '@/presentation/components/Button'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { MapContainer } from '@/presentation/components/MapContainer'
import { Modal } from '@/presentation/components/Modal'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { Tabs } from '@/presentation/components/Tabs'
import { Timeline, type TimelineItem } from '@/presentation/components/Timeline'
import { useDrivers } from '@/presentation/hooks/useDrivers'
import { useIncidentsByTrip } from '@/presentation/hooks/useIncidentsByTrip'
import { useNotificationsByTrip } from '@/presentation/hooks/useNotificationsByTrip'
import { useTripDetail } from '@/presentation/hooks/useTripDetail'
import { useTripMapData } from '@/presentation/hooks/useTripMapData'
import { useVehicles } from '@/presentation/hooks/useVehicles'
import {
  INCIDENT_TYPE_LABELS,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONE,
} from '@/shared/constants/notification.constants'
import { DRIVER_STATUS_LABELS, VEHICLE_STATUS_LABELS } from '@/shared/constants/vehicle.constants'
import { TRIP_STATUS_LABELS } from '@/shared/constants/trip.constants'
import { toAppError } from '@/shared/errors/AppError'
import { formatDateTime, formatTime } from '@/shared/utils/date'
import { formatDistance } from '@/shared/utils/formatDistance'
import { formatPhone } from '@/shared/utils/formatPhone'
import { formatVehiclePlate } from '@/shared/utils/formatVehiclePlate'

import { IncidentForm } from '../incidents/IncidentForm'
import { ReassignTripForm } from './ReassignTripForm'
import styles from './TripDetailPage.module.css'

// Subconjunto de TripEvent.type que representa un cambio a lo ya asignado
// (rule pedida: "Cambios" separado de la cronología completa) — hoy solo
// existe reasignación de chofer/vehículo y su posible override de
// conflicto (ver ReassignTripUseCase/GenerateRecurringTripsUseCase); no hay
// todavía reasignación de horario/origen/destino.
const CHANGE_EVENT_TYPES: ReadonlySet<string> = new Set([
  TripEventType.DRIVER_REASSIGNED,
  TripEventType.VEHICLE_REASSIGNED,
  TripEventType.ASSIGNMENT_OVERRIDE,
  TripEventType.RESCHEDULED,
])

export function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const tripDetail = useTripDetail(id ?? '')
  const mapData = useTripMapData(id ?? '')
  const drivers = useDrivers()
  const vehicles = useVehicles()
  const incidents = useIncidentsByTrip(id ?? '')
  const notifications = useNotificationsByTrip(id ?? '')

  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false)
  const [isReassignModalOpen, setIsReassignModalOpen] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [startError, setStartError] = useState<string | null>(null)
  const [isRequestingConfirmation, setIsRequestingConfirmation] = useState(false)
  const [confirmationError, setConfirmationError] = useState<string | null>(null)
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

  const changeEvents = trip.events.filter((event) => CHANGE_EVENT_TYPES.has(event.type))

  async function handleStartTrip(): Promise<void> {
    setStartError(null)
    setIsStarting(true)
    try {
      await useCases.startTrip.execute(tripId, user.fullName)
      tripDetail.reload()
      mapData.reload()
    } catch (error) {
      setStartError(toAppError(error).message)
    } finally {
      setIsStarting(false)
    }
  }

  async function handleRequestConfirmation(): Promise<void> {
    setConfirmationError(null)
    setIsRequestingConfirmation(true)
    try {
      await useCases.requestTripConfirmation.execute(tripId)
      tripDetail.reload()
    } catch (error) {
      setConfirmationError(toAppError(error).message)
    } finally {
      setIsRequestingConfirmation(false)
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
    incidents.reload()
  }

  function handleReassigned(): void {
    setIsReassignModalOpen(false)
    tripDetail.reload()
  }

  const canRegisterIncident = !isTerminalTripStatus(trip.status)
  const canReassign = !isTerminalTripStatus(trip.status)

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
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          {passenger.firstName} {passenger.lastName}
          <StatusBadge status={trip.status} />
        </div>
        <div className={styles.actions}>
          {trip.status === TripStatus.SCHEDULED && (
            <Button
              variant="secondary"
              onClick={() => void handleRequestConfirmation()}
              isLoading={isRequestingConfirmation}
            >
              Enviar confirmación al familiar
            </Button>
          )}
          {(trip.status === TripStatus.SCHEDULED ||
            trip.status === TripStatus.CONFIRMATION_PENDING) && (
            <Button onClick={() => void handleStartTrip()} isLoading={isStarting}>
              Iniciar traslado
            </Button>
          )}
          {canRegisterIncident && (
            <Button variant="secondary" onClick={() => setIsIncidentModalOpen(true)}>
              Registrar incidente
            </Button>
          )}
          {canReassign && (
            <Button variant="secondary" onClick={() => setIsReassignModalOpen(true)}>
              Reasignar chofer/vehículo
            </Button>
          )}
        </div>
      </div>

      {startError && <Alert tone="danger">{startError}</Alert>}
      {confirmationError && <Alert tone="danger">{confirmationError}</Alert>}

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
          <Tabs
            tabs={[
              {
                id: 'history',
                label: 'Historial',
                content:
                  historyItems.length > 0 ? (
                    <Timeline items={historyItems} />
                  ) : (
                    <p>
                      <AlertTriangle size={14} aria-hidden="true" /> Todavía no hay eventos
                      registrados.
                    </p>
                  ),
              },
              {
                id: 'changes',
                label: 'Cambios',
                content:
                  changeEvents.length > 0 ? (
                    <div className={styles.notificationList}>
                      {changeEvents.map((event) => (
                        <Card key={event.id} className={styles.notificationItem}>
                          <div>
                            <p>{event.description}</p>
                            {event.previousValue && event.newValue && (
                              <p className={styles.infoLabel}>
                                {event.previousValue} → {event.newValue}
                              </p>
                            )}
                            <span className={styles.infoLabel}>
                              {event.actor} · {formatDateTime(event.timestamp)}
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <EmptyState title="Todavía no hubo cambios de chofer ni vehículo en este viaje" />
                  ),
              },
              {
                id: 'incidents',
                label: 'Incidencias',
                content: (
                  <>
                    {incidents.state.status === 'loading' && (
                      <LoadingState message="Cargando incidencias…" />
                    )}
                    {incidents.state.status === 'error' && (
                      <ErrorState message={incidents.state.message} onRetry={incidents.reload} />
                    )}
                    {incidents.state.status === 'empty' && (
                      <EmptyState title="Este viaje no tiene incidencias registradas" />
                    )}
                    {incidents.state.status === 'success' && (
                      <div className={styles.notificationList}>
                        {incidents.state.data.map((incident) => (
                          <Card key={incident.id} className={styles.notificationItem}>
                            <div>
                              <p>{incident.description}</p>
                              <span className={styles.infoLabel}>
                                {incident.reportedBy} · {formatDateTime(incident.timestamp)} ·{' '}
                                {incident.estimatedDelayMinutes} min de demora estimada
                              </span>
                              {incident.observations && (
                                <p className={styles.infoLabel}>{incident.observations}</p>
                              )}
                            </div>
                            <Badge tone="danger">{INCIDENT_TYPE_LABELS[incident.type]}</Badge>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ),
              },
              {
                id: 'notifications',
                label: 'Notificaciones',
                content: (
                  <>
                    {notifications.state.status === 'loading' && (
                      <LoadingState message="Cargando notificaciones…" />
                    )}
                    {notifications.state.status === 'error' && (
                      <ErrorState
                        message={notifications.state.message}
                        onRetry={notifications.reload}
                      />
                    )}
                    {notifications.state.status === 'empty' && (
                      <EmptyState title="Todavía no se envió ninguna notificación para este viaje" />
                    )}
                    {notifications.state.status === 'success' && (
                      <div className={styles.notificationList}>
                        {notifications.state.data.map((notification) => (
                          <Card key={notification.id} className={styles.notificationItem}>
                            <div>
                              <p>{notification.message}</p>
                              <span className={styles.infoLabel}>
                                {formatDateTime(notification.createdAt)}
                              </span>
                            </div>
                            <Badge tone={NOTIFICATION_TYPE_TONE[notification.type]}>
                              {NOTIFICATION_TYPE_LABELS[notification.type]}
                            </Badge>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                ),
              },
            ]}
          />
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

      <Modal
        isOpen={isReassignModalOpen}
        onClose={() => setIsReassignModalOpen(false)}
        title="Reasignar chofer/vehículo"
      >
        <ReassignTripForm
          tripId={trip.id}
          currentDriverId={trip.driverId}
          currentVehicleId={trip.vehicleId}
          scheduledDeparture={trip.scheduledDeparture}
          estimatedArrival={trip.estimatedArrival}
          driverOptions={driverOptions}
          vehicleOptions={vehicleOptions}
          changedBy={user.fullName}
          onReassigned={handleReassigned}
        />
      </Modal>
    </div>
  )
}
