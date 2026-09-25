import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { toAppError } from '@/shared/errors/AppError'

import styles from './TripForm.module.css'

const tripFormSchema = z
  .object({
    passengerId: z.string().min(1, 'Seleccioná un paciente.'),
    driverId: z.string().min(1, 'Seleccioná un chofer.'),
    vehicleId: z.string().min(1, 'Seleccioná un vehículo.'),
    scheduledDeparture: z.string().min(1, 'Ingresá la fecha y hora de salida.'),
    estimatedArrival: z.string().min(1, 'Ingresá la fecha y hora de llegada estimada.'),
  })
  .refine((data) => new Date(data.estimatedArrival) > new Date(data.scheduledDeparture), {
    message: 'La llegada estimada debe ser posterior a la salida.',
    path: ['estimatedArrival'],
  })

type TripFormValues = z.infer<typeof tripFormSchema>

interface TripFormProps {
  readonly passengerOptions: readonly SelectOption[]
  readonly driverOptions: readonly SelectOption[]
  readonly vehicleOptions: readonly SelectOption[]
  readonly onRegistered: () => void
}

// Alta de traslado (rule: "agregar traslados"). El origen/destino se copian
// del paciente elegido (ver RegisterTripUseCase) — acá no se piden a mano.
// Arranca siempre PROGRAMADO; el resto del ciclo de vida lo actualiza el
// chofer por WhatsApp.
export function TripForm({
  passengerOptions,
  driverOptions,
  vehicleOptions,
  onRegistered,
}: TripFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      passengerId: '',
      driverId: '',
      vehicleId: '',
      scheduledDeparture: '',
      estimatedArrival: '',
    },
  })

  async function onSubmit(values: TripFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerTrip.execute({
        passengerId: values.passengerId,
        driverId: values.driverId,
        vehicleId: values.vehicleId,
        scheduledDeparture: new Date(values.scheduledDeparture).toISOString(),
        estimatedArrival: new Date(values.estimatedArrival).toISOString(),
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

      <Button type="submit" isLoading={isSubmitting}>
        Guardar traslado
      </Button>
    </form>
  )
}
