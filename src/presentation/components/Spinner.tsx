import styles from './Spinner.module.css'

interface SpinnerProps {
  readonly size?: number
  readonly label?: string
}

export function Spinner({ size = 24, label = 'Cargando' }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label={label}
      className={styles.spinner}
      style={{ width: size, height: size }}
    />
  )
}
