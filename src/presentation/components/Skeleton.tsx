import { classNames } from '@/shared/utils/classNames'

import styles from './Skeleton.module.css'

interface SkeletonProps {
  readonly width?: string | number
  readonly height?: string | number
  readonly className?: string
}

export function Skeleton({ width = '100%', height = '1rem', className }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={classNames(styles.skeleton, className)}
      style={{ width, height }}
    />
  )
}
