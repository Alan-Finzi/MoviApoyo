import styles from './FeedbackState.module.css'
import { Spinner } from './Spinner'

interface LoadingStateProps {
  readonly message?: string
}

export function LoadingState({ message = 'Cargando información…' }: LoadingStateProps) {
  return (
    <div className={styles.container} role="status">
      <Spinner size={32} label={message} />
      <p className={styles.description}>{message}</p>
    </div>
  )
}
