import { createContext, useCallback, useContext, useState } from 'react'
import type { ReactNode } from 'react'

import type { StatusTone } from '@/shared/constants/trip.constants'

import styles from './Toast.module.css'

interface ToastItem {
  readonly id: string
  readonly message: string
  readonly tone: StatusTone
}

interface ToastContextValue {
  readonly showToast: (message: string, tone?: StatusTone) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)
const AUTO_DISMISS_MS = 5000

// Context API para un caso que sí lo justifica: mostrar un aviso flotante
// desde cualquier punto del árbol (acá, desde el puente con la simulación
// de traslados) sin pasar callbacks de mano en mano.
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, tone: StatusTone = 'info') => {
    const id = crypto.randomUUID()
    setToasts((current) => [...current, { id, message, tone }])
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id))
    }, AUTO_DISMISS_MS)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className={styles.stack} aria-live="polite" role="status">
        {toasts.map((toast) => (
          <div key={toast.id} className={styles.toast}>
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast debe usarse dentro de <ToastProvider>.')
  }
  return context
}
