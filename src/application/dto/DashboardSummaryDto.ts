// Agregados que consume el Dashboard (rule 5). Se calculan en el Use Case,
// no en el componente: la pantalla solo renderiza números ya listos.
export interface DashboardSummaryDto {
  readonly tripsToday: number
  // Todavía no salieron: programados, o esperando confirmación del familiar
  // / aceptación del chofer (ver TRIP_AWAITING_DEPARTURE_STATUSES).
  readonly tripsUpcoming: number
  readonly tripsInProgress: number
  readonly tripsCompleted: number
  readonly tripsDelayed: number
  readonly tripsCancelled: number
  // Agrupa NO_REALIZADO y PACIENTE_AUSENTE: dos motivos distintos, mismo
  // resultado ("no se completó"), y separarlos en dos tarjetas para un
  // volumen que hoy es chico no aporta.
  readonly tripsNotCompleted: number
  readonly activeIncidents: number
  readonly emergencies: number
  readonly vehiclesAvailable: number
  readonly vehiclesWithIssues: number
  readonly childrenTransportedToday: number
}
