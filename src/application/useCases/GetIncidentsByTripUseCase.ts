import type { Incident } from '@/domain/entities/Incident'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'

// Arma la sección "Incidencias" del detalle del viaje (rule pedida:
// reconstruir todo lo que le pasó a un traslado sin buscar en otra
// pantalla).
export class GetIncidentsByTripUseCase {
  constructor(private readonly incidentRepository: IncidentRepository) {}

  async execute(tripId: string): Promise<Incident[]> {
    const incidents = await this.incidentRepository.getIncidents()
    return incidents
      .filter((incident) => incident.tripId === tripId)
      .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
}
