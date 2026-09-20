import type { ButtonHTMLAttributes } from 'react'

import { classNames } from '@/shared/utils/classNames'

import styles from './IconButton.module.css'

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly label: string
}

// `label` es obligatorio (no opcional) para forzar a que todo IconButton
// tenga un aria-label: son botones sin texto visible, así que sin esto
// quedan mudos para un lector de pantalla (rule 17).
export function IconButton({ label, className, children, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      className={classNames(styles.iconButton, className)}
      {...rest}
    >
      {children}
    </button>
  )
}
