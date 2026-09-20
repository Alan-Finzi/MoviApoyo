import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react'

import type { StatusTone } from '@/shared/constants/trip.constants'

import styles from './Alert.module.css'

interface AlertProps {
  readonly tone: Extract<StatusTone, 'success' | 'warning' | 'danger' | 'info'>
  readonly children: ReactNode
}

const ICON_BY_TONE: Record<AlertProps['tone'], ReactNode> = {
  success: <CheckCircle2 size={18} aria-hidden="true" />,
  warning: <AlertTriangle size={18} aria-hidden="true" />,
  danger: <XCircle size={18} aria-hidden="true" />,
  info: <Info size={18} aria-hidden="true" />,
}

export function Alert({ tone, children }: AlertProps) {
  return (
    <div
      className={`${styles.alert} ${styles[tone]}`}
      role={tone === 'danger' ? 'alert' : 'status'}
    >
      <span className={styles.icon}>{ICON_BY_TONE[tone]}</span>
      <div>{children}</div>
    </div>
  )
}
