import type { PassengerBloodType } from '@/domain/enums/PassengerBloodType'
import type { PassengerSex } from '@/domain/enums/PassengerSex'
import type { PassengerStatus } from '@/domain/enums/PassengerStatus'
import type { Address } from '@/domain/valueObjects/Address'

// Datos necesarios para operar el traslado del día a día (dashboard,
// listados, choferes). Nunca incluye información médica ni documentos:
// eso vive en PassengerSensitiveInfo y se obtiene con una llamada aparte
// (rule 12 — separar datos públicos de operación de datos privados).
// birthDate/sex no se consideran sensibles acá a propósito: son datos
// operativos comunes (ej. elegir vehículo/sillita adecuada), no médicos.
export interface Passenger {
  readonly id: string
  readonly firstName: string
  readonly lastName: string
  readonly birthDate?: string
  readonly sex?: PassengerSex
  readonly homeAddress: Address
  readonly destinationAddress: Address
  readonly guardianId: string
  readonly photoUrl?: string
  readonly status: PassengerStatus
  // Dato operativo para chofer/despacho (ej. "usa silla de ruedas"),
  // deliberadamente separado de `observations` en PassengerSensitiveInfo:
  // este es público, ese requiere el click explícito de "ver información
  // sensible".
  readonly operationalNotes?: string
  readonly createdAt: string
  readonly updatedAt: string
}

// Información sensible del pasajero. Solo debe pedirse explícitamente desde
// una pantalla que la necesite realmente (ej. ficha ampliada), nunca como
// parte de un listado general.
export interface PassengerSensitiveInfo {
  readonly passengerId: string
  readonly documentNumber?: string
  readonly bloodType?: PassengerBloodType
  readonly allergies?: readonly string[]
  readonly medicalNotes?: string
  readonly observations?: string
  readonly updatedAt?: string
}

export function getPassengerFullName(passenger: Passenger): string {
  return `${passenger.firstName} ${passenger.lastName}`
}
