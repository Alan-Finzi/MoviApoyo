import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import { Weekday } from '@/domain/enums/Weekday'
import type { AssignmentConflict } from '@/domain/services/AssignmentConflictChecker'
import { resolveOccurrenceDates } from '@/domain/services/RecurringTripScheduler'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { LocationPickerMap } from '@/presentation/components/LocationPickerMap'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { DEFAULT_MAP_CENTER } from '@/shared/constants/app.constants'
import { WEEKDAY_OPTIONS, WEEKDAY_QUICK_PICKS } from '@/shared/constants/destination.constants'
import { addMinutes, minutesBetween } from '@/shared/utils/date'
import { toAppError } from '@/shared/errors/AppError'

import styles from './TripForm.module.css'

const HOME_VALUE = 'HOME'
const OTHER_VALUE = 'OTHER'
const ADDRESS_TYPE_OPTIONS: readonly SelectOption[] = [
  { value: HOME_VALUE, label: 'Domicilio del paciente' },
  { value: OTHER_VALUE, label: 'Otra dirección' },
]

const WEEKDAY_VALUES = Object.values(Weekday) as [Weekday, ...Weekday[]]

const tripFormSchema = z
  .object({
    passengerId: z.string().min(1, 'Seleccioná un paciente.'),
    driverId: z.string().min(1, 'Seleccioná un chofer.'),
    vehicleId: z.string().min(1, 'Seleccioná un vehículo.'),
    originType: z.enum([HOME_VALUE, OTHER_VALUE]),
    originAddressStreet: z.string(),
    originLatitude: z.number(),
    originLongitude: z.number(),
    destinationType: z.enum([HOME_VALUE, OTHER_VALUE]),
    destinationAddressStreet: z.string(),
    destinationLatitude: z.number(),
    destinationLongitude: z.number(),
    scheduledDeparture: z.string().min(1, 'Ingresá la fecha y hora de salida.'),
    estimatedArrival: z.string().min(1, 'Ingresá la fecha y hora de llegada estimada.'),
    isRecurring: z.boolean(),
    weekdays: z.array(z.enum(WEEKDAY_VALUES)),
    recurrenceEndDate: z.string(),
  })
  .refine((data) => new Date(data.estimatedArrival) > new Date(data.scheduledDeparture), {
    message: 'La llegada estimada debe ser posterior a la salida.',
    path: ['estimatedArrival'],
  })
  .refine((data) => data.originType !== OTHER_VALUE || data.originAddressStreet.trim() !== '', {
    message: 'Ingresá la dirección de origen.',
    path: ['originAddressStreet'],
  })
  .refine(
    (data) => data.destinationType !== OTHER_VALUE || data.destinationAddressStreet.trim() !== '',
    { message: 'Ingresá el destino.', path: ['destinationAddressStreet'] },
  )
  .refine((data) => !data.isRecurring || data.weekdays.length > 0, {
    message: 'Elegí al menos un día.',
    path: ['weekdays'],
  })
  .refine((data) => !data.isRecurring || data.recurrenceEndDate !== '', {
    message: 'Ingresá hasta cuándo se repite.',
    path: ['recurrenceEndDate'],
  })
  .refine(
    (data) =>
      !data.isRecurring ||
      data.recurrenceEndDate === '' ||
      data.recurrenceEndDate >= data.scheduledDeparture.slice(0, 10),
    {
      message: 'La fecha de fin de la recurrencia debe ser posterior a la fecha de salida.',
      path: ['recurrenceEndDate'],
    },
  )

type TripFormValues = z.infer<typeof tripFormSchema>

interface TripFormProps {
  readonly passengerOptions: readonly SelectOption[]
  readonly driverOptions: readonly SelectOption[]
  readonly vehicleOptions: readonly SelectOption[]
  readonly registeredBy: string
  readonly onRegistered: () => void
}

function buildScheduleForDate(
  values: TripFormValues,
  date: string,
): { scheduledDeparture: string; estimatedArrival: string } {
  const departureTimePart = values.scheduledDeparture.split('T')[1] ?? '00:00'
  const durationMinutes = minutesBetween(
    new Date(values.scheduledDeparture).toISOString(),
    new Date(values.estimatedArrival).toISOString(),
  )
  const scheduledDeparture = new Date(`${date}T${departureTimePart}`).toISOString()
  const estimatedArrival = addMinutes(scheduledDeparture, durationMinutes)
  return { scheduledDeparture, estimatedArrival }
}

// Alta de traslado (rule: "agregar traslados"). Tanto el origen como el
// destino se eligen cada vez entre "domicilio del paciente" u "otra
// dirección" (rule pedida) — un paciente puede necesitar que lo pasen a
// buscar o lo dejen en un lugar distinto según el viaje (ver Passenger). Si
// se marca "es recurrente", se generan varios traslados independientes de
// una sola vez (mismo criterio de auditoría de conflictos que
// GenerateRecurringTripsUseCase: no bloquea, pero deja constancia en cada
// uno). Arranca siempre PROGRAMADO; el resto del ciclo de vida lo actualiza
// el chofer por WhatsApp.
export function TripForm({
  passengerOptions,
  driverOptions,
  vehicleOptions,
  registeredBy,
  onRegistered,
}: TripFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<readonly AssignmentConflict[] | null>(null)
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      passengerId: '',
      driverId: '',
      vehicleId: '',
      originType: HOME_VALUE,
      originAddressStreet: '',
      originLatitude: DEFAULT_MAP_CENTER.latitude,
      originLongitude: DEFAULT_MAP_CENTER.longitude,
      destinationType: OTHER_VALUE,
      destinationAddressStreet: '',
      destinationLatitude: DEFAULT_MAP_CENTER.latitude,
      destinationLongitude: DEFAULT_MAP_CENTER.longitude,
      scheduledDeparture: '',
      estimatedArrival: '',
      isRecurring: false,
      weekdays: [],
      recurrenceEndDate: '',
    },
  })

  const originType = watch('originType')
  const destinationType = watch('destinationType')
  const isRecurring = watch('isRecurring')
  const originLocation = { latitude: watch('originLatitude'), longitude: watch('originLongitude') }
  const destinationLocation = {
    latitude: watch('destinationLatitude'),
    longitude: watch('destinationLongitude'),
  }

  // Si el coordinador cambia chofer/vehículo/horario después de ver una
  // advertencia de conflicto, esa advertencia queda obsoleta — se descarta
  // para forzar un chequeo nuevo antes de guardar.
  const assignmentFields = watch(['driverId', 'vehicleId', 'scheduledDeparture', 'estimatedArrival'])
  const previousAssignmentFields = useRef(assignmentFields)
  useEffect(() => {
    if (previousAssignmentFields.current.join('|') !== assignmentFields.join('|')) {
      setConflicts(null)
    }
    previousAssignmentFields.current = assignmentFields
  }, [assignmentFields])

  // Pasar a "es recurrente" cambia por completo cómo se guarda (un traslado
  // vs. varios auditados sin bloquear) — cualquier advertencia de conflicto
  // de la corrida anterior deja de aplicar.
  useEffect(() => {
    setConflicts(null)
  }, [isRecurring])

  async function registerTripForDates(
    values: TripFormValues,
    dates: readonly string[],
    forcedOverrides?: readonly string[],
  ): Promise<void> {
    // Un id compartido por esta tanda, para poder agruparlos en la lista de
    // traslados (ver Trip.recurrenceGroupId) — solo tiene sentido cuando se
    // genera más de uno de una sola vez.
    const recurrenceGroupId = dates.length > 1 ? crypto.randomUUID() : undefined

    for (const date of dates) {
      const { scheduledDeparture, estimatedArrival } = buildScheduleForDate(values, date)

      let overriddenConflicts = forcedOverrides
      if (!overriddenConflicts && dates.length > 1) {
        const found = await useCases.checkAssignmentConflicts.execute({
          driverId: values.driverId,
          vehicleId: values.vehicleId,
          scheduledDeparture,
          estimatedArrival,
        })
        overriddenConflicts = found.length > 0 ? found.map((conflict) => conflict.message) : undefined
      }

      await useCases.registerTrip.execute({
        passengerId: values.passengerId,
        driverId: values.driverId,
        vehicleId: values.vehicleId,
        originIsHome: values.originType === HOME_VALUE,
        originAddressStreet: values.originType === OTHER_VALUE ? values.originAddressStreet : undefined,
        originLatitude: values.originType === OTHER_VALUE ? values.originLatitude : undefined,
        originLongitude: values.originType === OTHER_VALUE ? values.originLongitude : undefined,
        destinationIsHome: values.destinationType === HOME_VALUE,
        destinationAddressStreet:
          values.destinationType === OTHER_VALUE ? values.destinationAddressStreet : undefined,
        destinationLatitude: values.destinationType === OTHER_VALUE ? values.destinationLatitude : undefined,
        destinationLongitude:
          values.destinationType === OTHER_VALUE ? values.destinationLongitude : undefined,
        scheduledDeparture,
        estimatedArrival,
        registeredBy,
        overriddenConflicts,
        recurrenceGroupId,
      })
    }
  }

  function buildOccurrenceDates(values: TripFormValues): readonly string[] {
    if (!values.isRecurring) return [values.scheduledDeparture.slice(0, 10)]
    return resolveOccurrenceDates(
      { recurrence: DestinationRecurrence.WEEKDAYS, weekdays: values.weekdays, specificDate: null },
      values.scheduledDeparture.slice(0, 10),
      values.recurrenceEndDate,
    )
  }

  async function onSubmit(values: TripFormValues): Promise<void> {
    setSubmitError(null)

    const dates = buildOccurrenceDates(values)
    if (dates.length === 0) {
      setSubmitError(
        'No hay ninguna fecha dentro del rango elegido que coincida con los días marcados.',
      )
      return
    }

    // Un solo traslado: se mantiene el flujo existente de chequear
    // conflictos y pedir confirmación antes de guardar de todos modos.
    if (dates.length === 1) {
      if (conflicts && conflicts.length > 0) {
        try {
          await registerTripForDates(
            values,
            dates,
            conflicts.map((conflict) => conflict.message),
          )
          reset()
          setConflicts(null)
          onRegistered()
        } catch (error) {
          setSubmitError(toAppError(error).message)
        }
        return
      }

      setIsCheckingConflicts(true)
      try {
        const { scheduledDeparture, estimatedArrival } = buildScheduleForDate(values, dates[0]!)
        const found = await useCases.checkAssignmentConflicts.execute({
          driverId: values.driverId,
          vehicleId: values.vehicleId,
          scheduledDeparture,
          estimatedArrival,
        })
        if (found.length > 0) {
          setConflicts(found)
          return
        }
        await registerTripForDates(values, dates)
        reset()
        setConflicts(null)
        onRegistered()
      } catch (error) {
        setSubmitError(toAppError(error).message)
      } finally {
        setIsCheckingConflicts(false)
      }
      return
    }

    // Recurrente con varias fechas: mismo criterio que
    // GenerateRecurringTripsUseCase — no bloquea por conflictos, los audita
    // en cada traslado generado (ver overriddenConflicts).
    setIsCheckingConflicts(true)
    try {
      await registerTripForDates(values, dates)
      reset()
      setConflicts(null)
      onRegistered()
    } catch (error) {
      setSubmitError(toAppError(error).message)
    } finally {
      setIsCheckingConflicts(false)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
    >
      {submitError && <Alert tone="danger">{submitError}</Alert>}

      <Select
        label="Paciente"
        options={[{ value: '', label: 'Seleccioná un paciente…' }, ...passengerOptions]}
        error={errors.passengerId?.message}
        {...register('passengerId')}
      />
      <Select
        label="Chofer"
        options={[{ value: '', label: 'Seleccioná un chofer…' }, ...driverOptions]}
        error={errors.driverId?.message}
        {...register('driverId')}
      />
      <Select
        label="Vehículo"
        options={[{ value: '', label: 'Seleccioná un vehículo…' }, ...vehicleOptions]}
        error={errors.vehicleId?.message}
        {...register('vehicleId')}
      />

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Origen</span>
        <Select label="Tipo de origen" options={ADDRESS_TYPE_OPTIONS} {...register('originType')} />
        {originType === OTHER_VALUE && (
          <>
            <Input
              label="Dirección"
              error={errors.originAddressStreet?.message}
              {...register('originAddressStreet')}
            />
            <LocationPickerMap
              location={originLocation}
              onChange={(location) => {
                setValue('originLatitude', location.latitude)
                setValue('originLongitude', location.longitude)
              }}
            />
          </>
        )}
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Destino</span>
        <Select
          label="Tipo de destino"
          options={ADDRESS_TYPE_OPTIONS}
          {...register('destinationType')}
        />
        {destinationType === OTHER_VALUE && (
          <>
            <Input
              label="Dirección"
              error={errors.destinationAddressStreet?.message}
              {...register('destinationAddressStreet')}
            />
            <LocationPickerMap
              location={destinationLocation}
              onChange={(location) => {
                setValue('destinationLatitude', location.latitude)
                setValue('destinationLongitude', location.longitude)
              }}
            />
          </>
        )}
      </div>

      <Input
        label="Salida programada"
        type="datetime-local"
        error={errors.scheduledDeparture?.message}
        {...register('scheduledDeparture')}
      />
      <Input
        label="Llegada estimada"
        type="datetime-local"
        error={errors.estimatedArrival?.message}
        {...register('estimatedArrival')}
      />

      <div className={styles.fieldGroup}>
        <label className={styles.checkboxOption}>
          <input type="checkbox" {...register('isRecurring')} />
          Es recurrente
        </label>

        {isRecurring && (
          <>
            <span className={styles.groupTitle}>Días</span>
            <div className={styles.quickPicks}>
              {WEEKDAY_QUICK_PICKS.map((pick) => (
                <Button
                  key={pick.label}
                  type="button"
                  variant="secondary"
                  onClick={() => setValue('weekdays', [...pick.days])}
                >
                  {pick.label}
                </Button>
              ))}
            </div>
            <div className={styles.weekdayGrid}>
              {WEEKDAY_OPTIONS.map((day) => (
                <label key={day.value} className={styles.weekdayOption}>
                  <input type="checkbox" value={day.value} {...register('weekdays')} />
                  {day.label}
                </label>
              ))}
            </div>
            {errors.weekdays && <span className={styles.error}>{errors.weekdays.message}</span>}

            <Input
              label="Repetir hasta"
              type="date"
              error={errors.recurrenceEndDate?.message}
              {...register('recurrenceEndDate')}
            />
          </>
        )}
      </div>

      {conflicts && conflicts.length > 0 && (
        <Alert tone="warning">
          <strong>Se detectaron posibles conflictos de asignación:</strong>
          <ul className={styles.conflictList}>
            {conflicts.map((conflict, index) => (
              <li key={`${conflict.type}-${index}`}>{conflict.message}</li>
            ))}
          </ul>
          Podés guardar igual si hay un motivo operativo para hacerlo.
        </Alert>
      )}

      <Button type="submit" isLoading={isSubmitting || isCheckingConflicts}>
        {conflicts && conflicts.length > 0 ? 'Guardar de todos modos' : 'Guardar traslado'}
      </Button>
    </form>
  )
}
