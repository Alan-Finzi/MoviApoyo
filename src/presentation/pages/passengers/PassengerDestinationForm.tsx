import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { DestinationRecurrence } from '@/domain/enums/DestinationRecurrence'
import { Weekday } from '@/domain/enums/Weekday'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { LocationPickerMap } from '@/presentation/components/LocationPickerMap'
import { Select } from '@/presentation/components/Select'
import { DEFAULT_MAP_CENTER } from '@/shared/constants/app.constants'
import {
  RECURRENCE_LABELS,
  WEEKDAY_OPTIONS,
  WEEKDAY_QUICK_PICKS,
} from '@/shared/constants/destination.constants'
import { toAppError } from '@/shared/errors/AppError'

import styles from './PassengerDestinationForm.module.css'

const WEEKDAY_VALUES = Object.values(Weekday) as [Weekday, ...Weekday[]]
const RECURRENCE_VALUES = Object.values(DestinationRecurrence) as [
  DestinationRecurrence,
  ...DestinationRecurrence[],
]

const destinationFormSchema = z
  .object({
    label: z.string().min(1, 'Ingresá un nombre para el destino.'),
    addressStreet: z.string().min(1, 'Ingresá la dirección.'),
    latitude: z.number(),
    longitude: z.number(),
    recurrence: z.enum(RECURRENCE_VALUES),
    weekdays: z.array(z.enum(WEEKDAY_VALUES)),
    specificDate: z.string(),
    time: z.string().min(1, 'Ingresá el horario.'),
  })
  .refine(
    (data) => data.recurrence !== DestinationRecurrence.WEEKDAYS || data.weekdays.length > 0,
    { message: 'Elegí al menos un día.', path: ['weekdays'] },
  )
  .refine(
    (data) => data.recurrence !== DestinationRecurrence.SPECIFIC_DATE || data.specificDate !== '',
    { message: 'Elegí una fecha.', path: ['specificDate'] },
  )

type DestinationFormValues = z.infer<typeof destinationFormSchema>

const RECURRENCE_OPTIONS = RECURRENCE_VALUES.map((value) => ({
  value,
  label: RECURRENCE_LABELS[value],
}))

interface PassengerDestinationFormProps {
  readonly passengerId: string
  readonly onRegistered: () => void
}

// Alta de un destino adicional del paciente (rule: "un paciente puede tener
// muchos destinos"), con su propia recurrencia — días de la semana sueltos
// (incluye "todos los viernes" o "de lunes a viernes", según cuáles se
// tilden) o una fecha puntual única.
export function PassengerDestinationForm({
  passengerId,
  onRegistered,
}: PassengerDestinationFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DestinationFormValues>({
    resolver: zodResolver(destinationFormSchema),
    defaultValues: {
      label: '',
      addressStreet: '',
      latitude: DEFAULT_MAP_CENTER.latitude,
      longitude: DEFAULT_MAP_CENTER.longitude,
      recurrence: DestinationRecurrence.WEEKDAYS,
      weekdays: [],
      specificDate: '',
      time: '',
    },
  })

  const recurrence = watch('recurrence')
  const location = { latitude: watch('latitude'), longitude: watch('longitude') }

  async function onSubmit(values: DestinationFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerPassengerDestination.execute({
        passengerId,
        label: values.label,
        addressStreet: values.addressStreet,
        latitude: values.latitude,
        longitude: values.longitude,
        recurrence: values.recurrence,
        weekdays: values.weekdays,
        specificDate: values.specificDate || null,
        time: values.time,
      })
      reset()
      onRegistered()
    } catch (error) {
      setSubmitError(toAppError(error).message)
    }
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      noValidate
    >
      {submitError && <Alert tone="danger">{submitError}</Alert>}

      <Input
        label="Nombre del destino"
        placeholder="Ej. Escuela, Kinesiología..."
        error={errors.label?.message}
        {...register('label')}
      />

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Dirección</span>
        <Input
          label="Dirección"
          error={errors.addressStreet?.message}
          {...register('addressStreet')}
        />
        <LocationPickerMap
          location={location}
          onChange={(newLocation) => {
            setValue('latitude', newLocation.latitude)
            setValue('longitude', newLocation.longitude)
          }}
        />
      </div>

      <Select label="Recurrencia" options={RECURRENCE_OPTIONS} {...register('recurrence')} />

      {recurrence === DestinationRecurrence.WEEKDAYS && (
        <div className={styles.fieldGroup}>
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
        </div>
      )}

      {recurrence === DestinationRecurrence.SPECIFIC_DATE && (
        <Input
          label="Fecha"
          type="date"
          error={errors.specificDate?.message}
          {...register('specificDate')}
        />
      )}

      <Input label="Horario" type="time" error={errors.time?.message} {...register('time')} />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar destino
      </Button>
    </form>
  )
}
