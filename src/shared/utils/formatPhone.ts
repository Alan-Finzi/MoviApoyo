import type { PhoneNumber } from '@/domain/valueObjects/PhoneNumber'

// Da formato legible a un número de teléfono argentino normalizado
// (ej. "+5493511234567" -> "+54 9 351 123-4567"). Si el formato no coincide
// con el patrón esperado, devuelve el valor tal cual para no ocultar datos.
export function formatPhone(phone: PhoneNumber): string {
  const digits = phone.replace(/\D/g, '')
  const match = /^54?9?(\d{2,4})(\d{6,8})$/.exec(digits)
  if (!match) return phone

  const [, areaCode, localNumber] = match
  if (!areaCode || !localNumber) return phone
  const splitIndex = localNumber.length - 4
  const localFormatted = `${localNumber.slice(0, splitIndex)}-${localNumber.slice(splitIndex)}`
  return `+54 9 ${areaCode} ${localFormatted}`
}
