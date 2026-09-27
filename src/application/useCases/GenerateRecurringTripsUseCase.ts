import type { Trip } from '@/domain/entities/Trip'
import { TripEventType } from '@/domain/entities/TripEvent'
import { TripStatus } from '@/domain/enums/TripStatus'
import type { PassengerDestinationRepository } from '@/domain/repositories/PassengerDestinationRepository'
import type { PassengerRepository } from '@/domain/repositories/PassengerRepository'
import type { TripRepository } from '@/domain/repositories/TripRepository'
import type { AssignmentConflict } from '@/domain/services/AssignmentConflictChecker'
import { resolveOccurrenceDates } from '@/domain/services/RecurringTripScheduler'
import { addMinutes } from '@/shared/utils/date'
import { NotFoundError, ValidationError } from '@/shared/errors/AppError'

import type { CheckAssignmentConflictsUseCase } from './CheckAssignmentConflictsUseCase'

export interface GenerateRecurringTripsInput {
  readonly passengerId: string
  readonly destinationId: string
  readonly driverId: string
  readonly vehicleId: string
  // "yyyy-mm-dd", ambos inclusive.
  readonly startDate: string
  readonly endDate: string
  readonly durationMinutes: number
  readonly registeredBy: string
}

export interface GenerateRecurringTripsWarning {
  readonly tripId: string
  readonly date: string
  readonly conflicts: readonly AssignmentConflict[]
}

export interface GenerateRecurringTripsResult {
  readonly trips: readonly Trip[]
  // Traslados que se generaron igual pese a un conflicto de agenda (rule
  // pedida: no bloquear, pero que la excepción quede explícita y auditada —
  // cada uno ya tiene, además, su propio evento ASIGNACION_FORZADA).
  readonly warnings: readonly GenerateRecurringTripsWarning[]
}

// A partir de una "plantilla" (PassengerDestination con su recurrencia),
// genera traslados concretos e independientes: cada uno con su propio id,
// estado, chofer y vehículo (rule pedida). Modificar uno después —
// reasignarlo, cancelarlo, lo que sea (ver ReassignTripUseCase/
// UpdateTripStatusUseCase) — nunca afecta a los demás ni a la plantilla.
export class GenerateRecurringTripsUseCase {
  constructor(
    private readonly tripRepository: TripRepository,
    private readonly passengerDestinationRepository: PassengerDestinationRepository,
    private readonly passengerRepository: PassengerRepository,
    private readonly checkAssignmentConflictsUseCase: CheckAssignmentConflictsUseCase,
  ) {}

  async execute(input: GenerateRecurringTripsInput): Promise<GenerateRecurringTripsResult> {
    const [passenger, destinations] = await Promise.all([
      this.passengerRepository.getPassengerById(input.passengerId),
      this.passengerDestinationRepository.getDestinationsByPassenger(input.passengerId),
    ])

    const destination = destinations.find((item) => item.id === input.destinationId)
    if (!destination) {
      throw new NotFoundError(`No existe el destino con id "${input.destinationId}".`)
    }

    if (input.durationMinutes <= 0) {
      throw new ValidationError('La duración estimada del viaje debe ser mayor a 0.')
    }

    const dates = resolveOccurrenceDates(destination, input.startDate, input.endDate)
    if (dates.length === 0) {
      throw new ValidationError(
        'No hay ninguna fecha dentro del rango elegido que coincida con la recurrencia de este destino.',
      )
    }

    const trips: Trip[] = []
    const warnings: GenerateRecurringTripsWarning[] = []

    for (const date of dates) {
      const scheduledDeparture = new Date(`${date}T${destination.time}:00`).toISOString()
      const estimatedArrival = addMinutes(scheduledDeparture, input.durationMinutes)

      const conflicts = await this.checkAssignmentConflictsUseCase.execute({
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        scheduledDeparture,
        estimatedArrival,
      })

      const trip = await this.tripRepository.registerTrip({
        passengerId: input.passengerId,
        driverId: input.driverId,
        vehicleId: input.vehicleId,
        origin: passenger.homeAddress,
        destination: destination.address,
        scheduledDeparture,
        estimatedArrival,
        status: TripStatus.SCHEDULED,
        delayMinutes: 0,
        currentLocation: null,
        events: [],
        notifiedMilestones: [],
        actualDepartureAt: null,
        actualArrivalAt: null,
        sourceDestinationId: destination.id,
      })

      let updatedTrip = await this.tripRepository.appendTripEvent(trip.id, {
        tripId: trip.id,
        type: TripEventType.SCHEDULED,
        timestamp: new Date().toISOString(),
        description: `Traslado programado automáticamente desde el destino recurrente "${destination.label}".`,
        actor: input.registeredBy,
      })

      if (conflicts.length > 0) {
        updatedTrip = await this.tripRepository.appendTripEvent(trip.id, {
          tripId: trip.id,
          type: TripEventType.ASSIGNMENT_OVERRIDE,
          timestamp: new Date().toISOString(),
          description: `Se generó a pesar de: ${conflicts.map((c) => c.message).join(' / ')}`,
          actor: input.registeredBy,
        })
        warnings.push({ tripId: trip.id, date, conflicts })
      }

      trips.push(updatedTrip)
    }

    return { trips, warnings }
  }
}
