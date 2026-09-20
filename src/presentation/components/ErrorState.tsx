import { Button } from './Button'
import styles from './FeedbackState.module.css'

interface ErrorStateProps {
  readonly message: string
  readonly onRetry?: () => void
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.container} role="alert">
      <span className={styles.icon} aria-hidden="true">
        ⚠️
      </span>
      <p className={styles.title}>No se pudo cargar la información</p>
      <p className={styles.description}>{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={onRetry}>
          Reintentar
        </Button>
      )}
    </div>
  )
}
