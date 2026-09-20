import { forwardRef } from 'react'
import type { InputHTMLAttributes } from 'react'

import { classNames } from '@/shared/utils/classNames'

import styles from './FormField.module.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label: string
  readonly error?: string
  readonly hint?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name
  const errorId = error ? `${inputId}-error` : undefined
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div className={styles.field}>
      <label htmlFor={inputId} className={styles.label}>
        {label}
      </label>
      <input
        ref={ref}
        id={inputId}
        className={classNames(styles.input, error && styles.inputError, className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={classNames(errorId, hintId) || undefined}
        {...rest}
      />
      {hint && !error && (
        <span id={hintId} className={styles.hint}>
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
})
