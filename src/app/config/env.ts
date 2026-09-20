// Único punto de lectura de import.meta.env (rule 23). Todo lo demás en la
// aplicación importa `env` desde acá; así, si el día de mañana cambia el
// nombre de una variable o se agrega una nueva, se toca un solo archivo.
export type MapProvider = 'mock' | 'leaflet' | 'google' | 'mapbox'
export type WhatsappProvider = 'mock' | 'whatsapp-business' | 'external'

export interface AppConfig {
  readonly appName: string
  readonly apiBaseUrl: string
  readonly mapProvider: MapProvider
  readonly mapApiKey: string
  readonly whatsappProvider: WhatsappProvider
  readonly notificationsEnabled: boolean
}

function readBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined || value === '') return fallback
  return value === 'true'
}

function readMapProvider(value: string | undefined): MapProvider {
  if (value === 'leaflet' || value === 'google' || value === 'mapbox') return value
  return 'mock'
}

function readWhatsappProvider(value: string | undefined): WhatsappProvider {
  if (value === 'whatsapp-business' || value === 'external') return value
  return 'mock'
}

export const env: AppConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'MoviApoyo',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  mapProvider: readMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  mapApiKey: import.meta.env.VITE_MAP_API_KEY || '',
  whatsappProvider: readWhatsappProvider(import.meta.env.VITE_WHATSAPP_PROVIDER),
  notificationsEnabled: readBoolean(import.meta.env.VITE_NOTIFICATION_ENABLED, true),
}
