import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { IncidentType } from '@/domain/enums/IncidentType'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { INCIDENT_TYPE_LABELS } from '@/shared/constants/notification.constants'
import { toAppError } from '@/shared/errors/AppError'

import styles from './IncidentForm.module.css'

const INCIDENT_TYPE_VALUES = Object.values(IncidentType) as [IncidentType, ...IncidentType[]]

const INCIDENT_TYPE_OPTIONS: readonly SelectOption[] = INCIDENT_TYPE_VALUES.map((type) => ({
  value: type,
  label: INCIDENT_TYPE_LABELS[type],
}))

const incidentFormSchema = z.object({
  tripId: z.string().min(1, 'Seleccioná un traslado.'),
  type: z.enum(INCIDENT_TYPE_VALUES),
  description: z.string().min(5, 'Describí brevemente qué ocurrió.').max(300),
  estimatedDelayMinutes: z.coerce
    .number({ message: 'Ingresá un número de minutos.' })
    .int('La demora debe ser un número entero de minutos.')
    .min(1, 'La demora estimada debe ser mayor a 0.')
    .max(240, 'La demora estimada no puede superar las 4 horas.'),
  observations: z.string().max(300).optional(),
})

// z.coerce.number() acepta cualquier input (por eso su tipo de entrada es
// "unknown"), pero ya validado siempre es un number. React Hook Form
// necesita ambos tipos por separado: el de entrada para register/
// defaultValues, el de salida para lo que recibe onSubmit.
type IncidentFormInput = z.input<typeof incidentFormSchema>
type IncidentFormOutput = z.output<typeof incidentFormSchema>

interface IncidentFormProps {
  // Si se pasa tripId, el formulario queda fijado a ese traslado (uso desde
  // el detalle del traslado). Si no, se muestra el selector de traslados
  // (uso desde /incidentes).
  readonly tripId?: string
  readonly tripOptions?: readonly SelectOption[]
  readonly reportedBy: string
  readonly onRegistered: () => void
}

// Formulario reutilizado en dos lugares (rule 9): el detalle del traslado y
// la pantalla general de incidentes. React Hook Form + Zod se decidió con
// vos explícitamente para este caso (validación, loading y prevención de
// doble submit sin reinventar nada, rule 38).
export function IncidentForm({ tripId, tripOptions, reportedBy, onRegistered }: IncidentFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<IncidentFormInput, unknown, IncidentFormOutput>({
    resolver: zodResolver(incidentFormSchema),
    defaultValues: {
      tripId: tripId ?? '',
      type: IncidentType.TRAFFIC,
      estimatedDelayMinutes: 10,
      description: '',
      observations: '',
    },
  })

  async function onSubmit(values: IncidentFormOutput): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerIncident.execute({
        tripId: values.tripId,
        type: values.type,
        description: values.description,
        estimatedDelayMinutes: values.estimatedDelayMinutes,
        observations: values.observations,
        reportedBy,
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

      {tripId ? (
        <input type="hidden" {...register('tripId')} />
      ) : (
        <Select
          label="Traslado"
          options={tripOptions ?? []}
          error={errors.tripId?.message}
          {...register('tripId')}
        />
      )}

      <Select
        label="Tipo de inconveniente"
        options={INCIDENT_TYPE_OPTIONS}
        error={errors.type?.message}
        {...register('type')}
      />

      <Input label="Descripción" error={errors.description?.message} {...register('description')} />

      <Input
        label="Demora estimada (minutos)"
        type="number"
        min={1}
        max={240}
        error={errors.estimatedDelayMinutes?.message}
        {...register('estimatedDelayMinutes')}
      />

      <Input
        label="Observaciones (opcional)"
        error={errors.observations?.message}
        {...register('observations')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Registrar incidente
      </Button>
    </form>
  )
}
