import type { Incident } from '@/domain/entities/Incident'

export interface IncidentRepository {
  getIncidents(): Promise<Incident[]>
  registerIncident(incident: Omit<Incident, 'id'>): Promise<Incident>
}
