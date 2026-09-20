import type { HTMLAttributes } from 'react'

import type { StatusTone } from '@/shared/constants/trip.constants'
import { classNames } from '@/shared/utils/classNames'

import styles from './Badge.module.css'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly tone: StatusTone
  // El punto de color es solo decorativo: el texto siempre está presente,
  // para no depender únicamente del color (rule 17).
  readonly showDot?: boolean
}

export function Badge({ tone, showDot = true, className, children, ...rest }: BadgeProps) {
  return (
    <span className={classNames(styles.badge, styles[tone], className)} {...rest}>
      {showDot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  )
}
