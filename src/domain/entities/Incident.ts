import type { IncidentType } from '@/domain/enums/IncidentType'
import type { GeoCoordinates } from '@/domain/valueObjects/Address'

export interface Incident {
  readonly id: string
  readonly tripId: string
  readonly type: IncidentType
  readonly description: string
  readonly timestamp: string
  readonly location?: GeoCoordinates
  readonly estimatedDelayMinutes: number
  readonly observations?: string
  readonly reportedBy: string
}
