// Único punto de lectura de import.meta.env (rule 23). Todo lo demás en la
// aplicación importa `env` desde acá; así, si el día de mañana cambia el
// nombre de una variable o se agrega una nueva, se toca un solo archivo.
export type MapProvider = 'mock' | 'leaflet' | 'google' | 'mapbox'
export type WhatsappProvider = 'mock' | 'whatsapp-business' | 'external'

export interface FirebaseConfig {
  readonly apiKey: string
  readonly authDomain: string
  readonly projectId: string
  readonly storageBucket: string
  readonly messagingSenderId: string
  readonly appId: string
}

export interface AppConfig {
  readonly appName: string
  readonly apiBaseUrl: string
  readonly mapProvider: MapProvider
  readonly mapApiKey: string
  readonly whatsappProvider: WhatsappProvider
  readonly notificationsEnabled: boolean
  readonly firebase: FirebaseConfig
  // true solo cuando hay un projectId real cargado: así el composition root
  // sabe si debe usar los repositorios de Firestore o seguir con los Mock,
  // sin que nadie tenga que tocar código para "activar" Firebase.
  readonly isFirebaseConfigured: boolean
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

const firebaseProjectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || ''

export const env: AppConfig = {
  appName: import.meta.env.VITE_APP_NAME || 'MoviApoyo',
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '',
  mapProvider: readMapProvider(import.meta.env.VITE_MAP_PROVIDER),
  mapApiKey: import.meta.env.VITE_MAP_API_KEY || '',
  whatsappProvider: readWhatsappProvider(import.meta.env.VITE_WHATSAPP_PROVIDER),
  notificationsEnabled: readBoolean(import.meta.env.VITE_NOTIFICATION_ENABLED, true),
  firebase: {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: firebaseProjectId,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
    appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  },
  isFirebaseConfigured: firebaseProjectId !== '',
}
