import { fieldIn, runQuery } from './firestoreRest'
import type { Env } from './types'

// Los números guardados en Firestore (PhoneNumber, ver
// src/domain/valueObjects/PhoneNumber.ts del frontend) admiten un "+"
// inicial opcional, pero el campo "from" que manda Meta en el webhook viene
// siempre sin "+" (solo dígitos). Sin esto, ningún chofer/familiar se
// reconocería nunca.
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
// diseño original: nunca correr una acción a ciegas si el número no se
// reconoce). Un chofer nunca debería coincidir también con un guardián,
// pero por las dudas se prioriza chofer — es quien dispara acciones que
// cambian el estado del traslado, más sensible que una consulta de lectura.
export async function identifySender(env: Env, rawFrom: string): Promise<IdentifiedSender | null> {
  const variants = phoneVariants(rawFrom)

  const drivers = await runQuery(env, {
    from: [{ collectionId: 'drivers' }],
    where: fieldIn('phone', variants),
    limit: 1,
  })
  const driver = drivers[0]
  if (driver) return { type: 'driver', id: driver.id }

  const guardians = await runQuery(env, {
    from: [{ collectionId: 'guardians' }],
    where: fieldIn('phone', variants),
    limit: 1,
  })
  const guardian = guardians[0]
  if (guardian) {
    return {
      type: 'guardian',
      id: guardian.id,
      fullName: typeof guardian.data.fullName === 'string' ? guardian.data.fullName : 'Familiar',
      relationship:
        typeof guardian.data.relationship === 'string' ? guardian.data.relationship : 'Familiar',
    }
  }

  return null
}
