import { useEffect, useRef } from 'react'

import { useToast } from '@/presentation/components/ToastProvider'
import { NOTIFICATION_TYPE_TONE } from '@/shared/constants/notification.constants'
import { Logger } from '@/shared/utils/Logger'

import { notificationRepository } from './dependencies'

// Traduce las notificaciones que va generando TripSimulationEngine en
// toasts visibles, sin acoplar el motor de simulación (Infrastructure) a
// React. Se monta una única vez en la raíz de la aplicación (ver App.tsx).
export function NotificationToastBridge() {
  const { showToast } = useToast()
  const lastSeenCount = useRef(0)

  useEffect(
    () =>
      notificationRepository.subscribe(() => {
        notificationRepository
          .getNotifications()
          .then((notifications) => {
            const newNotifications = notifications.slice(lastSeenCount.current)
            lastSeenCount.current = notifications.length
            newNotifications.forEach((notification) => {
              showToast(notification.message, NOTIFICATION_TYPE_TONE[notification.type])
            })
          })
          .catch((error: unknown) => {
            Logger.error('No se pudieron leer las notificaciones nuevas', error)
          })
      }),
    [showToast],
  )

  return null
}
