import { getFirestore, Timestamp } from 'firebase-admin/firestore'

const COLLECTION = 'processedWhatsAppMessages'
// Meta puede reintentar un webhook varias veces si no responde 200 rápido
// (rule pedida: idempotencia). Un mensaje viejo no vale la pena seguir
// bloqueando para siempre, así que se limpia a los 7 días — suficiente
// margen para cualquier reintento real de Meta.
const RETENTION_DAYS = 7

// Usa el id del mensaje (wamid) como id de documento: si processMessage se
// llama dos veces para el mismo mensaje, la segunda vez este chequeo corta
// antes de ejecutar ninguna acción de negocio. `create()` (no `set()`) es a
// propósito: falla si el documento ya existe, así que ni siquiera hay una
// ventana de carrera entre "leer" y "marcar" si Meta manda el mismo webhook
// dos veces en paralelo.
export async function tryMarkMessageAsProcessed(messageId: string): Promise<boolean> {
  const docRef = getFirestore().collection(COLLECTION).doc(messageId)
  try {
    await docRef.create({
      processedAt: Timestamp.now(),
      expiresAt: Timestamp.fromMillis(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000),
    })
    return true
  } catch (error) {
    // Firestore no tipa el código de error en su SDK de Admin; 6 = ALREADY_EXISTS.
    const alreadyExists = (error as { code?: number }).code === 6
    if (alreadyExists) return false
    throw error
  }
}
