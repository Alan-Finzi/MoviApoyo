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

import styles from './ReassignTripForm.module.css'

const reassignFormSchema = z.object({
  driverId: z.string().min(1, 'Seleccioná un chofer.'),
  vehicleId: z.string().min(1, 'Seleccioná un vehículo.'),
  reason: z.string().min(5, 'Contá brevemente el motivo del cambio.').max(300),
})

type ReassignFormValues = z.infer<typeof reassignFormSchema>

interface ReassignTripFormProps {
  readonly tripId: string
  readonly currentDriverId: string
  readonly currentVehicleId: string
  readonly scheduledDeparture: string
  readonly estimatedArrival: string
  readonly driverOptions: readonly SelectOption[]
  readonly vehicleOptions: readonly SelectOption[]
  readonly changedBy: string
  readonly onReassigned: () => void
}

// Reasignar chofer/vehículo de un traslado ya creado (rule pedida: cambio de
// chofer/vehículo a mitad de viaje, ej. falla mecánica). Mismo patrón de
// "avisar sin bloquear" que TripForm: primero chequea conflictos de agenda,
// y si hay, deja confirmar de todos modos (queda auditado en
// ReassignTripUseCase).
export function ReassignTripForm({
  tripId,
  currentDriverId,
  currentVehicleId,
  scheduledDeparture,
  estimatedArrival,
  driverOptions,
  vehicleOptions,
  changedBy,
  onReassigned,
}: ReassignTripFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [conflicts, setConflicts] = useState<readonly AssignmentConflict[] | null>(null)
  const [isCheckingConflicts, setIsCheckingConflicts] = useState(false)
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<ReassignFormValues>({
    resolver: zodResolver(reassignFormSchema),
    defaultValues: {
      driverId: currentDriverId,
      vehicleId: currentVehicleId,
      reason: '',
    },
  })

  const assignmentFields = watch(['driverId', 'vehicleId'])
  const previousAssignmentFields = useRef(assignmentFields)
  useEffect(() => {
    if (previousAssignmentFields.current.join('|') !== assignmentFields.join('|')) {
      setConflicts(null)
    }
    previousAssignmentFields.current = assignmentFields
  }, [assignmentFields])

  async function reassignTrip(values: ReassignFormValues): Promise<void> {
    await useCases.reassignTrip.execute({
      tripId,
      newDriverId: values.driverId !== currentDriverId ? values.driverId : undefined,
      newVehicleId: values.vehicleId !== currentVehicleId ? values.vehicleId : undefined,
      reason: values.reason,
      changedBy,
      overriddenConflicts: conflicts?.map((conflict) => conflict.message),
    })
    onReassigned()
  }

  async function onSubmit(values: ReassignFormValues): Promise<void> {
    setSubmitError(null)

    if (values.driverId === currentDriverId && values.vehicleId === currentVehicleId) {
      setSubmitError('Elegí un chofer o un vehículo distinto al que tiene asignado.')
      return
    }

    if (conflicts && conflicts.length > 0) {
      try {
        await reassignTrip(values)
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
        scheduledDeparture,
        estimatedArrival,
        excludeTripId: tripId,
      })
      if (found.length > 0) {
        setConflicts(found)
        return
      }
      await reassignTrip(values)
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
        label="Chofer"
        options={driverOptions}
        error={errors.driverId?.message}
        {...register('driverId')}
      />
      <Select
        label="Vehículo"
        options={vehicleOptions}
        error={errors.vehicleId?.message}
        {...register('vehicleId')}
      />
      <Input
        label="Motivo del cambio"
        placeholder="Ej. Falla mecánica del vehículo asignado"
        error={errors.reason?.message}
        {...register('reason')}
      />

      {conflicts && conflicts.length > 0 && (
        <Alert tone="warning">
          <strong>Se detectaron posibles conflictos de asignación:</strong>
          <ul className={styles.conflictList}>
            {conflicts.map((conflict, index) => (
              <li key={`${conflict.type}-${index}`}>{conflict.message}</li>
            ))}
          </ul>
          Podés reasignar igual si hay un motivo operativo para hacerlo.
        </Alert>
      )}

      <Button type="submit" isLoading={isSubmitting || isCheckingConflicts}>
        {conflicts && conflicts.length > 0 ? 'Reasignar de todos modos' : 'Reasignar'}
      </Button>
    </form>
  )
}
