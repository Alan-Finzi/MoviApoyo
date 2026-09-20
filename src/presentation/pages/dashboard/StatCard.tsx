import type { ReactNode } from 'react'

import { Card } from '@/presentation/components/Card'
import type { StatusTone } from '@/shared/constants/trip.constants'

import styles from './StatCard.module.css'

interface StatCardProps {
  readonly value: number
  readonly label: string
  readonly icon: ReactNode
  readonly tone?: StatusTone
}

export function StatCard({ value, label, icon, tone = 'neutral' }: StatCardProps) {
  return (
    <Card className={styles.card}>
      <span className={`${styles.icon} ${styles[tone]}`} aria-hidden="true">
        {icon}
      </span>
      <div>
        <p className={styles.value}>{value}</p>
        <p className={styles.label}>{label}</p>
      </div>
    </Card>
  )
}
