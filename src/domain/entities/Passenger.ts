import type { Address } from '@/domain/valueObjects/Address'

// Datos necesarios para operar el traslado del día a día (dashboard,
// listados, choferes). Nunca incluye información médica ni documentos:
// eso vive en PassengerSensitiveInfo y se obtiene con una llamada aparte
// (rule 12 — separar datos públicos de operación de datos privados).
export interface Passenger {
  readonly id: string
  readonly firstName: string
  readonly lastName: string
  readonly homeAddress: Address
  readonly destinationAddress: Address
  readonly guardianId: string
  readonly photoUrl?: string
}

// Información sensible del pasajero. Solo debe pedirse explícitamente desde
// una pantalla que la necesite realmente (ej. ficha ampliada), nunca como
// parte de un listado general.
export interface PassengerSensitiveInfo {
  readonly passengerId: string
  readonly documentNumber?: string
  readonly medicalNotes?: string
  readonly observations?: string
}

export function getPassengerFullName(passenger: Passenger): string {
  return `${passenger.firstName} ${passenger.lastName}`
}
