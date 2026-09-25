import type { PassengerDestination } from '@/domain/entities/PassengerDestination'
import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import type { Weekday } from '@/domain/enums/Weekday'
import { WEEKDAY_ORDER } from '@/domain/enums/Weekday'
import { WEEKDAY_LABELS, WEEKDAY_QUICK_PICKS } from '@/shared/constants/destination.constants'

function formatWeekdaysList(weekdays: readonly Weekday[]): string {
  const ordered = WEEKDAY_ORDER.filter((day) => weekdays.includes(day))
  const quickPick = WEEKDAY_QUICK_PICKS.find(
    (pick) =>
      pick.days.length === ordered.length &&
      pick.days.every((day, index) => day === ordered[index]),
  )
  if (quickPick) return quickPick.label
  if (ordered.length === 0) return 'Sin días elegidos'
  return ordered.map((day) => WEEKDAY_LABELS[day]).join(', ')
}

// "yyyy-mm-dd" es una fecha de calendario pura, sin hora ni zona horaria —
// formatearla a mano (en vez de con `new Date(iso)` + Intl, como el resto de
// las fechas del proyecto en shared/utils/date.ts) evita que el corrimiento
// UTC-3 la muestre un día antes.
function formatCalendarDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

export function formatDestinationSchedule(destination: PassengerDestination): string {
  const timeLabel = destination.time ? ` a las ${destination.time}` : ''

  if (destination.recurrence === DestinationRecurrence.SPECIFIC_DATE) {
    const dateLabel = destination.specificDate
      ? formatCalendarDate(destination.specificDate)
      : 'sin fecha'
    return `${dateLabel}${timeLabel}`
  }

  return `${formatWeekdaysList(destination.weekdays)}${timeLabel}`
}
