import type { LicensePlate } from '@/domain/valueObjects/LicensePlate'

// Da formato visual a una patente ya normalizada, distinguiendo el formato
// viejo (AAA000) del formato Mercosur (AA000AA).
export function formatVehiclePlate(plate: LicensePlate): string {
  if (/^[A-Z]{3}[0-9]{3}$/.test(plate)) {
    return `${plate.slice(0, 3)} ${plate.slice(3)}`
  }
  if (/^[A-Z]{2}[0-9]{3}[A-Z]{2}$/.test(plate)) {
    return `${plate.slice(0, 2)} ${plate.slice(2, 5)} ${plate.slice(5)}`
  }
  return plate
}
