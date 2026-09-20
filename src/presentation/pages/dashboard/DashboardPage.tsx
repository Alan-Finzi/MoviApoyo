import { AlertTriangle, CalendarClock, CarFront, Clock3 } from 'lucide-react'

import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { useDashboardSummary } from '@/presentation/hooks/useDashboardSummary'
import { useTrips } from '@/presentation/hooks/useTrips'
import { TRIP_IN_PROGRESS_STATUSES } from '@/shared/constants/trip.constants'

import styles from './DashboardPage.module.css'
import { StatCard } from './StatCard'
import { TripCard } from './TripCard'

export function DashboardPage() {
  const summary = useDashboardSummary()
  const trips = useTrips()

  const activeTrips =
    trips.state.status === 'success'
      ? trips.state.data.filter((trip) => TRIP_IN_PROGRESS_STATUSES.has(trip.status))
      : []

  return (
    <div>
      <h1 className="sr-only">Dashboard</h1>

      {summary.state.status === 'loading' && <LoadingState message="Cargando resumen del día…" />}
      {summary.state.status === 'error' && (
        <ErrorState message={summary.state.message} onRetry={summary.reload} />
      )}
      {summary.state.status === 'success' && (
        <div className={styles.statsGrid}>
          <StatCard
            value={summary.state.data.tripsToday}
            label="Traslados hoy"
            icon={<CalendarClock size={20} aria-hidden="true" />}
            tone="info"
          />
          <StatCard
            value={summary.state.data.tripsInProgress}
            label="En curso"
            icon={<CarFront size={20} aria-hidden="true" />}
            tone="success"
          />
          <StatCard
            value={summary.state.data.tripsDelayed}
            label="Con demora"
            icon={<Clock3 size={20} aria-hidden="true" />}
            tone="warning"
          />
          <StatCard
            value={summary.state.data.activeIncidents}
            label="Incidentes"
            icon={<AlertTriangle size={20} aria-hidden="true" />}
            tone="danger"
          />
        </div>
      )}

      <section>
        <h2 className={styles.sectionTitle}>Traslados en curso</h2>
        {trips.state.status === 'loading' && <LoadingState message="Cargando traslados…" />}
        {trips.state.status === 'error' && (
          <ErrorState message={trips.state.message} onRetry={trips.reload} />
        )}
        {(trips.state.status === 'empty' ||
          (trips.state.status === 'success' && activeTrips.length === 0)) && (
          <EmptyState title="No hay traslados en curso en este momento" />
        )}
        {trips.state.status === 'success' && activeTrips.length > 0 && (
          <div className={styles.tripsGrid}>
            {activeTrips.map((trip) => (
              <TripCard key={trip.id} trip={trip} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
