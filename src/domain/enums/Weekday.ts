// "as const" en vez de enum de TS: el proyecto compila con
// erasableSyntaxOnly (ver comentario en TripStatus.ts). Lunes primero para
// que los rangos tipo "lunes a viernes" sean un slice contiguo del array.
export const Weekday = {
  MONDAY: 'LUNES',
  TUESDAY: 'MARTES',
  WEDNESDAY: 'MIERCOLES',
  THURSDAY: 'JUEVES',
  FRIDAY: 'VIERNES',
  SATURDAY: 'SABADO',
  SUNDAY: 'DOMINGO',
} as const

export type Weekday = (typeof Weekday)[keyof typeof Weekday]

// Orden natural de lunes a domingo — el objeto de arriba no garantiza orden
// de iteración estable para este propósito, así que se deja explícito.
export const WEEKDAY_ORDER: readonly Weekday[] = [
  Weekday.MONDAY,
  Weekday.TUESDAY,
  Weekday.WEDNESDAY,
  Weekday.THURSDAY,
  Weekday.FRIDAY,
  Weekday.SATURDAY,
  Weekday.SUNDAY,
]
