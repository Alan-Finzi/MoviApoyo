// Cómo se repite la visita a un destino de un paciente: un conjunto de días
// de la semana (ej. "todos los viernes", "de lunes a viernes") o una fecha
// puntual única (ej. un turno médico específico).
export const DestinationRecurrence = {
  WEEKDAYS: 'DIAS_DE_LA_SEMANA',
  SPECIFIC_DATE: 'FECHA_ESPECIFICA',
} as const

export type DestinationRecurrence =
  (typeof DestinationRecurrence)[keyof typeof DestinationRecurrence]
