// Centraliza formateo y aritmética de fechas. Nada en el resto del código
// debe llamar a Date.toString() o construir strings de fecha a mano: así,
// si el día de mañana cambiamos el locale o la librería, se toca solo este
// archivo (rule 50).
const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires'
const DEFAULT_LOCALE = 'es-AR'

export function formatDate(iso: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(iso))
}

export function formatTime(iso: string): string {
  return new Intl.DateTimeFormat(DEFAULT_LOCALE, {
    timeZone: DEFAULT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(iso))
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} ${formatTime(iso)}`
}

// Suma minutos a una fecha ISO y devuelve otra fecha ISO. Se usa, por
// ejemplo, para recalcular el horario estimado de llegada tras un incidente.
export function addMinutes(iso: string, minutes: number): string {
  return new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()
}

export function minutesBetween(fromIso: string, toIso: string): number {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 60_000)
}
