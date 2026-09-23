// Resultado de analizar el historial de viajes finalizados de un paciente,
// para sugerir si conviene salir antes o después de lo programado.
export interface ScheduleRecommendationDto {
  readonly sampleSize: number
  // Positivo = en promedio salió/llegó tarde; negativo = salió/llegó antes.
  readonly averageDepartureDeltaMinutes: number | null
  readonly averageArrivalDeltaMinutes: number | null
  readonly recommendationMessage: string
}
