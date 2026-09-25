import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import { Weekday, WEEKDAY_ORDER } from '@/domain/enums/Weekday'

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  [Weekday.MONDAY]: 'Lunes',
  [Weekday.TUESDAY]: 'Martes',
  [Weekday.WEDNESDAY]: 'Miércoles',
  [Weekday.THURSDAY]: 'Jueves',
  [Weekday.FRIDAY]: 'Viernes',
  [Weekday.SATURDAY]: 'Sábado',
  [Weekday.SUNDAY]: 'Domingo',
}

export const WEEKDAY_SHORT_LABELS: Record<Weekday, string> = {
  [Weekday.MONDAY]: 'Lun',
  [Weekday.TUESDAY]: 'Mar',
  [Weekday.WEDNESDAY]: 'Mié',
  [Weekday.THURSDAY]: 'Jue',
  [Weekday.FRIDAY]: 'Vie',
  [Weekday.SATURDAY]: 'Sáb',
  [Weekday.SUNDAY]: 'Dom',
}

export const WEEKDAY_OPTIONS = WEEKDAY_ORDER.map((day) => ({
  value: day,
  label: WEEKDAY_LABELS[day],
}))

export const RECURRENCE_LABELS: Record<DestinationRecurrence, string> = {
  [DestinationRecurrence.WEEKDAYS]: 'Días de la semana',
  [DestinationRecurrence.SPECIFIC_DATE]: 'Fecha específica',
}

// Atajos frecuentes (rule: "todos los viernes", "de lunes a viernes") para no
// tener que tildar los 5 checkboxes a mano cada vez.
export const WEEKDAY_QUICK_PICKS: readonly {
  readonly label: string
  readonly days: readonly Weekday[]
}[] = [
  {
    label: 'Lunes a viernes',
    days: [Weekday.MONDAY, Weekday.TUESDAY, Weekday.WEDNESDAY, Weekday.THURSDAY, Weekday.FRIDAY],
  },
  { label: 'Todos los días', days: WEEKDAY_ORDER },
]
