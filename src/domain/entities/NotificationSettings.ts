import type { ProximityCriterion } from '@/domain/enums/ProximityCriterion'

// Configuración global de anticipación de aviso (rule 8). Ambos criterios
// se guardan siempre: "criterion" define cuál está activo, así se puede
// cambiar de uno a otro sin perder la configuración del que quedó inactivo.
export interface NotificationSettings {
  readonly criterion: ProximityCriterion
  readonly distanceThresholdMeters: number
  readonly timeThresholdMinutes: number
  // Longitud de referencia de una cuadra, usada para convertir metros en
  // "cuadras aproximadas" al redactar el mensaje (rule 45: no es un valor
  // universal, por eso es configurable).
  readonly blockLengthMeters: number
}
