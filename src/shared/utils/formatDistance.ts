import type { Distance } from '@/domain/valueObjects/Distance'

// Formatea una distancia para mostrarla al usuario, eligiendo metros o
// kilómetros según corresponda (rule 25).
export function formatDistance(distance: Distance): string {
  if (distance.meters < 1000) {
    return `${Math.round(distance.meters)} m`
  }
  return `${(distance.meters / 1000).toFixed(1)} km`
}
