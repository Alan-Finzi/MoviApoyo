import { Badge } from '@/presentation/components/Badge'
import { Card } from '@/presentation/components/Card'
import { EmptyState } from '@/presentation/components/EmptyState'
import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { useNotifications } from '@/presentation/hooks/useNotifications'
import {
  NOTIFICATION_STATUS_LABELS,
  NOTIFICATION_STATUS_TONE,
  NOTIFICATION_TYPE_LABELS,
  NOTIFICATION_TYPE_TONE,
} from '@/shared/constants/notification.constants'
import { formatDateTime } from '@/shared/utils/date'

import styles from './NotificationsPage.module.css'

export function NotificationsPage() {
  const notifications = useNotifications()

  return (
    <div>
      <h1 className={styles.title}>Centro de notificaciones</h1>

      {notifications.state.status === 'loading' && (
        <LoadingState message="Cargando notificaciones…" />
      )}
      {notifications.state.status === 'error' && (
        <ErrorState message={notifications.state.message} onRetry={notifications.reload} />
      )}
      {notifications.state.status === 'empty' && (
        <EmptyState
          title="Todavía no se envió ninguna notificación"
          description="Las notificaciones aparecen acá a medida que los traslados avanzan."
        />
      )}
      {notifications.state.status === 'success' && (
        <div className={styles.list}>
          {notifications.state.data.map((notification) => (
            <Card key={notification.id} className={styles.item}>
              <div className={styles.itemMain}>
                <p className={styles.message}>{notification.message}</p>
                <span className={styles.meta}>{formatDateTime(notification.createdAt)}</span>
              </div>
              <div className={styles.badges}>
                <Badge tone={NOTIFICATION_TYPE_TONE[notification.type]}>
                  {NOTIFICATION_TYPE_LABELS[notification.type]}
                </Badge>
                <Badge tone={NOTIFICATION_STATUS_TONE[notification.status]} showDot={false}>
                  {NOTIFICATION_STATUS_LABELS[notification.status]}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
