import { createDocument, toFirestoreTimestamp } from './firestoreRest'
import type { Env } from './types'

const COLLECTION = 'processedWhatsAppMessages'
// Meta puede reintentar un webhook varias veces si no responde 200 rápido
// (rule pedida: idempotencia). Un mensaje viejo no vale la pena seguir
// bloqueando para siempre — se guarda `expiresAt` con 7 días de margen para
// que, el día que se configure una política de TTL en Firestore (ver
// README.md), se limpien solos. Esto no cambia por migrar a Cloudflare: la
// política de TTL se configura en Firestore mismo, no en quien escribe.
const RETENTION_DAYS = 7

// Usa el id del mensaje (wamid) como id de documento: si esto se llama dos
// veces para el mismo mensaje, la segunda vez `createDocument` devuelve
// `null` (ya existe) antes de ejecutar ninguna acción de negocio — sin
// ventana de carrera entre "leer" y "marcar" aunque Meta mande el mismo
// webhook dos veces en paralelo (createDocument con id explícito falla si
// ya existe, mismo comportamiento que `.create()` del Admin SDK).
export async function tryMarkMessageAsProcessed(env: Env, messageId: string): Promise<boolean> {
  const now = Date.now()
  const created = await createDocument(
    env,
    COLLECTION,
    {
      processedAt: toFirestoreTimestamp(new Date(now).toISOString()),
      expiresAt: toFirestoreTimestamp(new Date(now + RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()),
    },
    messageId,
  )
  return created !== null
}
