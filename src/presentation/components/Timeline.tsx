import { Check } from 'lucide-react'

import { classNames } from '@/shared/utils/classNames'

import styles from './Timeline.module.css'

export interface TimelineItem {
  readonly id: string
  readonly label: string
  readonly timestamp?: string
  readonly isCompleted: boolean
}

interface TimelineProps {
  readonly items: readonly TimelineItem[]
}

// Reutilizable (rule 34): tanto la línea de progreso del traslado como su
// historial de eventos se arman con este mismo componente.
export function Timeline({ items }: TimelineProps) {
  return (
    <ol className={styles.timeline}>
      {items.map((item) => (
        <li key={item.id} className={classNames(styles.item, item.isCompleted && styles.completed)}>
          <span className={styles.marker} aria-hidden="true">
            {item.isCompleted && <Check size={13} />}
          </span>
          <div className={styles.content}>
            <span className={styles.label}>{item.label}</span>
            {item.timestamp && <span className={styles.timestamp}>{item.timestamp}</span>}
          </div>
        </li>
      ))}
    </ol>
  )
}
