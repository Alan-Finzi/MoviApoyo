import { useEffect } from 'react'

import { tripRepository } from '@/app/providers/dependencies'

// Vuelve a pedir los datos cada vez que TripSimulationEngine modifica algún
// traslado (rule 32: el dashboard y los listados deben reflejar el estado
// en vivo, no solo lo que había al entrar a la pantalla).
export function useLiveTripUpdates(onUpdate: () => void): void {
  useEffect(() => tripRepository.subscribe(onUpdate), [onUpdate])
}
