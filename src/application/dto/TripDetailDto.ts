import type { Driver } from '@/domain/entities/Driver'
import type { Guardian } from '@/domain/entities/Guardian'
import type { Passenger } from '@/domain/entities/Passenger'
import type { Trip } from '@/domain/entities/Trip'
import type { Vehicle } from '@/domain/entities/Vehicle'

// Agrupa el traslado con todas las entidades relacionadas que necesita la
// pantalla de detalle, ya resueltas (rule 7).
export interface TripDetailDto {
  readonly trip: Trip
  readonly passenger: Passenger
  readonly driver: Driver
  readonly vehicle: Vehicle
  readonly guardian: Guardian
}
