import type { Trip } from '@/domain/entities/Trip'
import { TripEventType } from '@/domain/entities/TripEvent'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'

export interface RegisterTripInput {
  readonly passengerId: string
  readonly driverId: string
  readonly vehicleId: string
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
}

// Alta de traslado desde el panel de admin. El origen/destino se copian del
// domicilio/destino del paciente en este momento (ver comentario en la
// entidad Trip: un traslado ya finalizado tiene que conservar la dirección
// real usada, aunque el paciente cambie de domicilio después). Arranca
// siempre en PROGRAMADO — el resto del ciclo de vida lo maneja el chofer por
// WhatsApp (ver docs/whatsapp-bot.md), no se elige a mano acá.
export class RegisterTripUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerRepository: PassengerRepository,
  ) {}

  async execute(input: RegisterTripInput): Promise<Trip> {
    const passenger = await this.passengerRepository.getPassengerById(input.passengerId)

    const trip = await this.tripRepository.registerTrip({
      passengerId: input.passengerId,
      driverId: input.driverId,
      vehicleId: input.vehicleId,
      origin: passenger.homeAddress,
      destination: passenger.destinationAddress,
      scheduledDeparture: input.scheduledDeparture,
      estimatedArrival: input.estimatedArrival,
      status: TripStatus.SCHEDULED,
      delayMinutes: 0,
      currentLocation: null,
      events: [],
      notifiedMilestones: [],
      actualDepartureAt: null,
      actualArrivalAt: null,
    })

    return this.tripRepository.appendTripEvent(trip.id, {
      tripId: trip.id,
      type: TripEventType.SCHEDULED,
      timestamp: new Date().toISOString(),
      description: 'Traslado programado.',
      actor: 'Sistema',
    })
  }
}
