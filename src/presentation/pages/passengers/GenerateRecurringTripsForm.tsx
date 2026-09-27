import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import type { GenerateRecurringTripsResult } from '@/application/useCases/GenerateRecurringTripsUseCase'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { toAppError } from '@/shared/errors/AppError'

import styles from './GenerateRecurringTripsForm.module.css'

const generateFormSchema = z
  .object({
    driverId: z.string().min(1, 'Seleccioná un chofer.'),
    vehicleId: z.string().min(1, 'Seleccioná un vehículo.'),
    startDate: z.string().min(1, 'Ingresá la fecha desde.'),
    endDate: z.string().min(1, 'Ingresá la fecha hasta.'),
    durationMinutes: z.coerce
      .number({ message: 'Ingresá un número de minutos.' })
      .int('La duración debe ser un número entero de minutos.')
      .min(1, 'La duración debe ser mayor a 0.')
      .max(240, 'La duración no puede superar las 4 horas.'),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'La fecha hasta debe ser igual o posterior a la fecha desde.',
    path: ['endDate'],
  })

type GenerateFormInput = z.input<typeof generateFormSchema>
type GenerateFormOutput = z.output<typeof generateFormSchema>

interface GenerateRecurringTripsFormProps {
  readonly passengerId: string
  readonly destinationId: string
  readonly driverOptions: readonly SelectOption[]
  readonly vehicleOptions: readonly SelectOption[]
  readonly registeredBy: string
  readonly onGenerated: (result: GenerateRecurringTripsResult) => void
}

// Genera traslados independientes a partir de un destino recurrente (rule
// pedida: la recurrencia es una plantilla, los traslados generados no
// quedan acoplados entre sí — ver GenerateRecurringTripsUseCase). El
// chofer/vehículo elegidos acá son el punto de partida de cada traslado
// generado, no una asignación permanente: cada uno se puede reasignar
// después de forma independiente (ver ReassignTripForm).
export function GenerateRecurringTripsForm({
  passengerId,
  destinationId,
  driverOptions,
  vehicleOptions,
  registeredBy,
  onGenerated,
}: GenerateRecurringTripsFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<GenerateFormInput, unknown, GenerateFormOutput>({
    resolver: zodResolver(generateFormSchema),
    defaultValues: {
      driverId: '',
      vehicleId: '',
      startDate: '',
      endDate: '',
      durationMinutes: 30,
    },
  })

  async function onSubmit(values: GenerateFormOutput): Promise<void> {
    setSubmitError(null)
    try {
      const result = await useCases.generateRecurringTrips.execute({
        passengerId,
        destinationId,
        driverId: values.driverId,
        vehicleId: values.vehicleId,
        startDate: values.startDate,
        endDate: values.endDate,
        durationMinutes: values.durationMinutes,
        registeredBy,
      })
      onGenerated(result)
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

      <div className={styles.row}>
        <Input
          label="Desde"
          type="date"
          error={errors.startDate?.message}
          {...register('startDate')}
        />
        <Input
          label="Hasta"
          type="date"
          error={errors.endDate?.message}
          {...register('endDate')}
        />
      </div>

      <Input
        label="Duración estimada del viaje (minutos)"
        type="number"
        min={1}
        max={240}
        error={errors.durationMinutes?.message}
        {...register('durationMinutes')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Generar viajes
      </Button>
    </form>
  )
}
