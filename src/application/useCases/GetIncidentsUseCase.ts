import type { Incident } from '@/domain/entities/Incident'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'

export class GetIncidentsUseCase {
  constructor(private readonly incidentRepository: IncidentRepository) {}

  async execute(): Promise<Incident[]> {
    const incidents = await this.incidentRepository.getIncidents()
    return [...incidents].sort((a, b) => b.timestamp.localeCompare(a.timestamp))
  }
}
