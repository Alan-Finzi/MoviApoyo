// Bindings del Worker (ver wrangler.toml para las vars públicas; los
// secrets se cargan con `wrangler secret put NOMBRE`, nunca quedan en este
// repo — ver README.md).
export interface Env {
  readonly FIREBASE_PROJECT_ID: string
  // La Web API Key de Firebase no es secreta (es la misma que ya viaja en
  // el bundle público de la web, VITE_FIREBASE_API_KEY) — identifica el
  // proyecto, no autentica nada por sí sola. Igual se carga como secret acá
  // por prolijidad, no por necesidad de ocultarla.
  readonly FIREBASE_WEB_API_KEY: string
  // Login de Firebase Authentication creado a mano para el bot (ver
  // README.md) — el Worker inicia sesión como este usuario para poder
  // leer/escribir Firestore, igual que hace la web con un admin/coordinador.
  readonly WHATSAPP_BOT_EMAIL: string
  readonly WHATSAPP_BOT_PASSWORD: string
  readonly WHATSAPP_VERIFY_TOKEN: string
  readonly WHATSAPP_ACCESS_TOKEN: string
  readonly WHATSAPP_PHONE_NUMBER_ID: string
}
