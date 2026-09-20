// Agregados que consume el Dashboard (rule 5). Se calculan en el Use Case,
// no en el componente: la pantalla solo renderiza números ya listos.
export interface DashboardSummaryDto {
  readonly tripsToday: number
  readonly tripsInProgress: number
  readonly tripsUpcoming: number
  readonly tripsCompleted: number
  readonly tripsDelayed: number
  readonly activeIncidents: number
  readonly vehiclesAvailable: number
  readonly vehiclesWithIssues: number
  readonly childrenTransportedToday: number
}
