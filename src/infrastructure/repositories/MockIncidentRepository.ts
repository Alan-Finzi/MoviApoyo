import type { Incident } from '@/domain/entities/Incident'
import type { IncidentRepository } from '@/domain/repositories/IncidentRepository'

import { incidentsStore } from './stores'

export class MockIncidentRepository implements IncidentRepository {
  getIncidents(): Promise<Incident[]> {
    return Promise.resolve(incidentsStore.getState())
  }

  registerIncident(incident: Omit<Incident, 'id'>): Promise<Incident> {
    const newIncident: Incident = { ...incident, id: `incident-${crypto.randomUUID()}` }
    incidentsStore.setState((incidents) => [...incidents, newIncident])
    return Promise.resolve(newIncident)
  }
}
