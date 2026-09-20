import { ValidationError } from '@/shared/errors/AppError'

export type LicensePlate = string & { readonly __brand: 'LicensePlate' }

const OLD_FORMAT = /^[A-Z]{3}[0-9]{3}$/
const MERCOSUR_FORMAT = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/

export function createLicensePlate(value: string): LicensePlate {
  const normalized = value.trim().toUpperCase().replace(/[\s-]/g, '')
  if (!OLD_FORMAT.test(normalized) && !MERCOSUR_FORMAT.test(normalized)) {
    throw new ValidationError(`Patente inválida: "${value}".`)
  }
  return normalized as LicensePlate
}
