import { Car, UserRound } from 'lucide-react'
import { Link } from 'react-router-dom'

import type { TripListItemDto } from '@/application/dto/TripListItemDto'
import { StatusBadge } from '@/presentation/components/StatusBadge'
import { buildTripDetailRoute } from '@/shared/constants/routes.constants'
import { formatTime } from '@/shared/utils/date'

import styles from './TripCard.module.css'

interface TripCardProps {
  readonly trip: TripListItemDto
}

// Tarjeta de traslado para el dashboard (rule 32): la información crítica
// (estado, demora) debe verse sin tener que entrar al detalle.
export function TripCard({ trip }: TripCardProps) {
  return (
    <Link to={buildTripDetailRoute(trip.id)} className={styles.card}>
      <div className={styles.header}>
        <span className={styles.childName}>{trip.childFullName}</span>
        <StatusBadge status={trip.status} />
      </div>
      <p className={styles.time}>
        {formatTime(trip.scheduledDeparture)} → {formatTime(trip.estimatedArrival)}
      </p>
      <div className={styles.meta}>
        <span className={styles.metaItem}>
          <Car size={14} aria-hidden="true" />
          {trip.vehiclePlate}
        </span>
        <span className={styles.metaItem}>
          <UserRound size={14} aria-hidden="true" />
          {trip.driverName}
        </span>
      </div>
      {trip.delayMinutes > 0 && <p className={styles.delay}>Demora: {trip.delayMinutes} min</p>}
    </Link>
  )
}
