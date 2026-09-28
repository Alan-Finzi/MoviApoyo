// Bindings del Worker (ver wrangler.toml para las vars públicas; los
// secrets se cargan con `wrangler secret put NOMBRE`, nunca quedan en este
// repo — ver README.md).
export interface Env {
  readonly FIREBASE_PROJECT_ID: string
  readonly GOOGLE_SERVICE_ACCOUNT_EMAIL: string
  // PEM completo (con los "-----BEGIN PRIVATE KEY-----"), tal cual viene en
  // el JSON de la cuenta de servicio, campo "private_key".
  readonly GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: string
  readonly WHATSAPP_VERIFY_TOKEN: string
  readonly WHATSAPP_ACCESS_TOKEN: string
  readonly WHATSAPP_PHONE_NUMBER_ID: string
}
