import { ValidationError } from '@/shared/errors/AppError'

// "Branded type": en tiempo de compilación es un string, pero solo se puede
// obtener llamando a createPhoneNumber(), que garantiza el formato. Evita
// pasar cualquier string suelto donde se espera un teléfono ya validado.
export type PhoneNumber = string & { readonly __brand: 'PhoneNumber' }

const PHONE_REGEX = /^\+?[0-9]{8,15}$/

export function createPhoneNumber(value: string): PhoneNumber {
  const normalized = value.replace(/[\s-]/g, '')
  if (!PHONE_REGEX.test(normalized)) {
    throw new ValidationError(`Número de teléfono inválido: "${value}".`)
  }
  return normalized as PhoneNumber
}
