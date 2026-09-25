import type { Passenger } from '@/domain/entities/Passenger'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'

export interface RegisterPassengerInput {
  readonly firstName: string
  readonly lastName: string
  readonly homeAddressStreet: string
  readonly homeLatitude: number
  readonly homeLongitude: number
  readonly destinationAddressStreet: string
  readonly destinationLatitude: number
  readonly destinationLongitude: number
  readonly guardianId: string
}

// Alta de paciente desde el panel de admin. El tutor se elige entre los que
// ya existen (no se crea uno nuevo acá — ver docs, es un alcance aparte).
export class RegisterPassengerUseCase {
  constructor(private readonly passengerRepository: PassengerRepository) {}

  execute(input: RegisterPassengerInput): Promise<Passenger> {
    return this.passengerRepository.registerPassenger({
      firstName: input.firstName,
      lastName: input.lastName,
      homeAddress: {
        street: input.homeAddressStreet,
        coordinates: { latitude: input.homeLatitude, longitude: input.homeLongitude },
      },
      destinationAddress: {
        street: input.destinationAddressStreet,
        coordinates: { latitude: input.destinationLatitude, longitude: input.destinationLongitude },
      },
      guardianId: input.guardianId,
    })
  }
}
