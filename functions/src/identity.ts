import { getFirestore } from 'firebase-admin/firestore'

// Los números guardados en Firestore (PhoneNumber, ver
// src/domain/valueObjects/PhoneNumber.ts) admiten un "+" inicial opcional,
// pero el campo "from" que manda Meta en el webhook viene siempre sin "+"
// (solo dígitos). Sin esto, ningún chofer/familiar se reconocería nunca.
function phoneVariants(rawFrom: string): readonly string[] {
  const digitsOnly = rawFrom.replace(/^\+/, '')
  return [digitsOnly, `+${digitsOnly}`]
}

export interface IdentifiedDriver {
  readonly type: 'driver'
  readonly id: string
}

export interface IdentifiedGuardian {
  readonly type: 'guardian'
  readonly id: string
  readonly fullName: string
  readonly relationship: string
}

export type IdentifiedSender = IdentifiedDriver | IdentifiedGuardian

// Resuelve quién escribe antes de ejecutar cualquier acción (rule del
// diseño original: nunca correr un Use Case a ciegas si el número no se
// reconoce). Un chofer nunca debería coincidir también con un guardián,
// pero por las dudas se prioriza chofer — es quien dispara acciones que
// cambian el estado del traslado, más sensible que una consulta de lectura.
export async function identifySender(rawFrom: string): Promise<IdentifiedSender | null> {
  const variants = phoneVariants(rawFrom)
  const firestore = getFirestore()

  const driverSnapshot = await firestore
    .collection('drivers')
    .where('phone', 'in', variants)
    .limit(1)
    .get()
  const driverDoc = driverSnapshot.docs[0]
  if (driverDoc) {
    return { type: 'driver', id: driverDoc.id }
  }

  const guardianSnapshot = await firestore
    .collection('guardians')
    .where('phone', 'in', variants)
    .limit(1)
    .get()
  const guardianDoc = guardianSnapshot.docs[0]
  if (guardianDoc) {
    const data = guardianDoc.data()
    return {
      type: 'guardian',
      id: guardianDoc.id,
      fullName: typeof data.fullName === 'string' ? data.fullName : 'Familiar',
      relationship: typeof data.relationship === 'string' ? data.relationship : 'Familiar',
    }
  }

  return null
}
