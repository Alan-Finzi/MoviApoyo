import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import type { Weekday } from '@/domain/enums/Weekday'
import type { PassengerDestinationRepository } from '@/domain/repositories/PassengerDestinationRepository'
import { ValidationError } from '@/shared/errors/AppError'

export interface RegisterPassengerDestinationInput {
  readonly passengerId: string
  readonly label: string
  readonly addressStreet: string
  readonly latitude: number
  readonly longitude: number
  readonly recurrence: DestinationRecurrence
  readonly weekdays: readonly Weekday[]
  readonly specificDate: string | null
  readonly time: string
}

// Alta de un destino adicional de un paciente (rule: "un paciente puede
// tener muchos destinos"). La recurrencia (días de la semana vs. fecha
// puntual) se valida acá, no solo en el formulario — es la regla de negocio
// real, no un detalle de UI.
export class RegisterPassengerDestinationUseCase {
  constructor(private readonly repository: PassengerDestinationRepository) {}

  execute(input: RegisterPassengerDestinationInput): Promise<PassengerDestination> {
    if (input.recurrence === DestinationRecurrence.WEEKDAYS && input.weekdays.length === 0) {
      throw new ValidationError('Elegí al menos un día de la semana.')
    }
    if (input.recurrence === DestinationRecurrence.SPECIFIC_DATE && !input.specificDate) {
      throw new ValidationError('Elegí una fecha.')
    }

    return this.repository.registerDestination({
      passengerId: input.passengerId,
      label: input.label,
      address: {
        street: input.addressStreet,
        coordinates: { latitude: input.latitude, longitude: input.longitude },
      },
      recurrence: input.recurrence,
      weekdays: input.recurrence === DestinationRecurrence.WEEKDAYS ? input.weekdays : [],
      specificDate:
        input.recurrence === DestinationRecurrence.SPECIFIC_DATE ? input.specificDate : null,
      time: input.time,
    })
  }
}
