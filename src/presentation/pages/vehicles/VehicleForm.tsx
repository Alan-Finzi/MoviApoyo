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

import styles from './VehicleForm.module.css'

const NO_DRIVER_VALUE = ''
const CURRENT_YEAR = new Date().getFullYear()

const vehicleFormSchema = z.object({
  licensePlate: z.string().min(1, 'Ingresá la patente.'),
  brand: z.string().min(1, 'Ingresá la marca.'),
  model: z.string().min(1, 'Ingresá el modelo.'),
  year: z.coerce
    .number({ message: 'Ingresá un año válido.' })
    .int('El año debe ser un número entero.')
    .min(1980, 'Ingresá un año válido.')
    .max(CURRENT_YEAR + 1, 'Ingresá un año válido.'),
  assignedDriverId: z.string(),
  notes: z.string().optional(),
})

// z.coerce.number() acepta cualquier input pero ya validado siempre es un
// number — RHF necesita ambos tipos por separado (ver mismo patrón en
// IncidentForm.tsx).
type VehicleFormInput = z.input<typeof vehicleFormSchema>
type VehicleFormOutput = z.output<typeof vehicleFormSchema>

interface VehicleFormProps {
  readonly driverOptions: readonly SelectOption[]
  readonly onRegistered: () => void
}

// Alta de vehículo (rule: "agregar vehículos"). Arranca DISPONIBLE, con
// combustible lleno y 0 km — no hay selector de esos valores acá.
export function VehicleForm({ driverOptions, onRegistered }: VehicleFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<VehicleFormInput, unknown, VehicleFormOutput>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      licensePlate: '',
      brand: '',
      model: '',
      year: CURRENT_YEAR,
      assignedDriverId: NO_DRIVER_VALUE,
      notes: '',
    },
  })

  async function onSubmit(values: VehicleFormOutput): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerVehicle.execute({
        licensePlate: values.licensePlate,
        brand: values.brand,
        model: values.model,
        year: values.year,
        assignedDriverId: values.assignedDriverId || null,
        notes: values.notes,
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
        label="Patente"
        placeholder="AB123CD"
        error={errors.licensePlate?.message}
        {...register('licensePlate')}
      />
      <Input label="Marca" error={errors.brand?.message} {...register('brand')} />
      <Input label="Modelo" error={errors.model?.message} {...register('model')} />
      <Input
        label="Año"
        type="number"
        min={1980}
        max={CURRENT_YEAR + 1}
        error={errors.year?.message}
        {...register('year')}
      />
      <Select
        label="Chofer asignado (opcional)"
        options={[{ value: NO_DRIVER_VALUE, label: 'Sin asignar' }, ...driverOptions]}
        error={errors.assignedDriverId?.message}
        {...register('assignedDriverId')}
      />
      <Input label="Notas (opcional)" error={errors.notes?.message} {...register('notes')} />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar vehículo
      </Button>
    </form>
  )
}
