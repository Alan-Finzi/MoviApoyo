import type { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import type { Weekday } from '@/domain/enums/Weekday'
import type { Address } from '@/domain/valueObjects/Address'

// Un paciente puede tener más de un destino habitual además del principal
// (escuela, kinesiología, una consulta médica puntual, etc.), cada uno con
// su propia recurrencia — no todos se visitan los mismos días.
//
// "weekdays" y "specificDate" se guardan siempre los dos (mismo patrón que
// NotificationSettings.criterion): "recurrence" define cuál está activo, así
// no se pierde la configuración del que quedó inactivo si se cambia de uno
// a otro.
export interface PassengerDestination {
  readonly id: string
  readonly passengerId: string
  // Nombre para identificar el destino en la lista (ej. "Escuela",
  // "Kinesiología", "Turno con neurólogo").
  readonly label: string
  readonly address: Address
  readonly recurrence: DestinationRecurrence
  readonly weekdays: readonly Weekday[]
  // ISO yyyy-mm-dd, o null si recurrence es WEEKDAYS.
  readonly specificDate: string | null
  // Hora del viaje a este destino, formato HH:mm.
  readonly time: string
}
