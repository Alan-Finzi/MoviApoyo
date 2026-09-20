import type { HTMLAttributes } from 'react'

import { classNames } from '@/shared/utils/classNames'

import styles from './Card.module.css'

export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={classNames(styles.card, className)} {...rest} />
}
