import { ValidationError } from '@/shared/errors/AppError'

export interface Distance {
  readonly meters: number
}

export function createDistance(meters: number): Distance {
  if (meters < 0) {
    throw new ValidationError('La distancia no puede ser negativa.')
  }
  return { meters }
}

// Una "cuadra" no mide siempre lo mismo (varía según la ciudad y el trazado
// urbano), por eso la longitud de referencia se recibe como parámetro en
// lugar de asumirse fija (rule 45) — sale de NotificationSettings.
export function metersToApproxBlocks(distance: Distance, blockLengthMeters: number): number {
  if (blockLengthMeters <= 0) {
    throw new ValidationError('La longitud de cuadra configurada debe ser mayor a 0.')
  }
  return distance.meters / blockLengthMeters
}
