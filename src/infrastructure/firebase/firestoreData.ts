import type { DocumentData } from 'firebase/firestore'

// Firestore no tipa el contenido de un documento (DocumentData es, en los
// hechos, `Record<string, any>`). Este es el único punto donde se "confía"
// en la forma de los datos guardados, en vez de dejar que ese `any` se
// filtre silenciosamente por cada fromFirestore(). Si el dato real no
// respeta la forma esperada, el bug aparece al usarlo (ej. createPhoneNumber
// tirando ValidationError), no de forma silenciosa.
export function asDocumentShape<T>(data: DocumentData): T {
  return data as T
}
