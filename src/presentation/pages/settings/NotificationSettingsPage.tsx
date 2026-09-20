import { ErrorState } from '@/presentation/components/ErrorState'
import { LoadingState } from '@/presentation/components/LoadingState'
import { useNotificationSettings } from '@/presentation/hooks/useNotificationSettings'

import { NotificationSettingsForm } from './NotificationSettingsForm'
import styles from './NotificationSettingsPage.module.css'

export function NotificationSettingsPage() {
  const { state, reload, updateSettings } = useNotificationSettings()

  async function handleSave(settings: Parameters<typeof updateSettings>[0]): Promise<void> {
    await updateSettings(settings)
  }

  return (
    <div>
      <h1 className={styles.title}>Configuración de aviso</h1>
      {state.status === 'loading' && <LoadingState message="Cargando configuración…" />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={reload} />}
      {state.status === 'success' && (
        <NotificationSettingsForm settings={state.data} onSave={handleSave} />
      )}
    </div>
  )
}
