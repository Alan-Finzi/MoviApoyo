import { classNames } from '@/shared/utils/classNames'

import styles from './Avatar.module.css'

interface AvatarProps {
  readonly fullName: string
  readonly photoUrl?: string
  readonly size?: 'sm' | 'md' | 'lg'
  readonly className?: string
}

function getInitials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? ''
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
  return `${first}${last}`.toUpperCase()
}

export function Avatar({ fullName, photoUrl, size = 'md', className }: AvatarProps) {
  return (
    <span className={classNames(styles.avatar, styles[size], className)} title={fullName}>
      {photoUrl ? (
        <img src={photoUrl} alt="" className={styles.image} />
      ) : (
        <span aria-hidden="true">{getInitials(fullName)}</span>
      )}
      <span className="sr-only">{fullName}</span>
    </span>
  )
}
