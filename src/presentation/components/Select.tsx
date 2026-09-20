import { forwardRef } from 'react'
import type { SelectHTMLAttributes } from 'react'

import { classNames } from '@/shared/utils/classNames'

import styles from './FormField.module.css'

export interface SelectOption {
  readonly value: string
  readonly label: string
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  readonly label: string
  readonly options: readonly SelectOption[]
  readonly error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, id, className, ...rest },
  ref,
) {
  const selectId = id ?? rest.name
  const errorId = error ? `${selectId}-error` : undefined

  return (
    <div className={styles.field}>
      <label htmlFor={selectId} className={styles.label}>
        {label}
      </label>
      <select
        ref={ref}
        id={selectId}
        className={classNames(styles.input, error && styles.inputError, className)}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={errorId}
        {...rest}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={errorId} className={styles.error} role="alert">
          {error}
        </span>
      )}
    </div>
  )
})
