/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_MAP_PROVIDER: string
  readonly VITE_MAP_API_KEY: string
  readonly VITE_WHATSAPP_PROVIDER: string
  readonly VITE_NOTIFICATION_ENABLED: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
