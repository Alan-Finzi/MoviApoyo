import { useEffect, useRef, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import type { AssignmentConflict } from '@/domain/services/AssignmentConflictChecker'
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
  readonly registeredBy: string
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

  async function registerTrip(values: TripFormValues): Promise<void> {
    await useCases.registerTrip.execute({
      passengerId: values.passengerId,
      driverId: values.driverId,
      vehicleId: values.vehicleId,
      scheduledDeparture: new Date(values.scheduledDeparture).toISOString(),
      estimatedArrival: new Date(values.estimatedArrival).toISOString(),
      registeredBy,
      overriddenConflicts: conflicts?.map((conflict) => conflict.message),
    })
    reset()
    setConflicts(null)
    onRegistered()
  }

  async function onSubmit(values: TripFormValues): Promise<void> {
    setSubmitError(null)

    // Ya se mostró la advertencia y el coordinador decidió guardar de todos
    // modos (rule pedida: no bloquear, pero que la excepción quede
    // auditada — ver descripción del traslado en RegisterTripUseCase).
    if (conflicts && conflicts.length > 0) {
      try {
        await registerTrip(values)
      } catch (error) {
        setSubmitError(toAppError(error).message)
      }
      return
    }

    setIsCheckingConflicts(true)
    try {
      const found = await useCases.checkAssignmentConflicts.execute({
        driverId: values.driverId,
        vehicleId: values.vehicleId,
        scheduledDeparture: new Date(values.scheduledDeparture).toISOString(),
        estimatedArrival: new Date(values.estimatedArrival).toISOString(),
      })
      if (found.length > 0) {
        setConflicts(found)
        return
      }
      await registerTrip(values)
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
