import type { TripStatus } from '@/domain/enums/TripStatus'

// Forma pensada para la pantalla de listado: ya trae los nombres resueltos
// (chofer, patente) para que el componente no tenga que ir a buscar cada
// entidad relacionada por su cuenta.
export interface TripListItemDto {
  readonly id: string
  readonly passengerId: string
  readonly childFullName: string
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  readonly originLabel: string
  readonly destinationLabel: string
  readonly driverId: string
  readonly driverName: string
  readonly vehicleId: string
  readonly vehiclePlate: string
  readonly status: TripStatus
  readonly delayMinutes: number
}
