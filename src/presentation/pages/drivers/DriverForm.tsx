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

import styles from './DriverForm.module.css'

const NO_VEHICLE_VALUE = ''

const driverFormSchema = z.object({
  firstName: z.string().min(1, 'Ingresá el nombre.'),
  lastName: z.string().min(1, 'Ingresá el apellido.'),
  phone: z.string().min(1, 'Ingresá el teléfono.'),
  assignedVehicleId: z.string(),
})

type DriverFormValues = z.infer<typeof driverFormSchema>

interface DriverFormProps {
  readonly vehicleOptions: readonly SelectOption[]
  readonly onRegistered: () => void
}

// Alta de chofer (rule: "agregar choferes"). Arranca DISPONIBLE — no hay
// selector de estado, ese lo maneja el ciclo de vida de los traslados.
export function DriverForm({ vehicleOptions, onRegistered }: DriverFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<DriverFormValues>({
    resolver: zodResolver(driverFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      assignedVehicleId: NO_VEHICLE_VALUE,
    },
  })

  async function onSubmit(values: DriverFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerDriver.execute({
        firstName: values.firstName,
        lastName: values.lastName,
        phone: values.phone,
        assignedVehicleId: values.assignedVehicleId || null,
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

      <Input label="Nombre" error={errors.firstName?.message} {...register('firstName')} />
      <Input label="Apellido" error={errors.lastName?.message} {...register('lastName')} />
      <Input
        label="Teléfono"
        placeholder="+549351..."
        hint="Incluí el código de país, ej. +549351..."
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Select
        label="Vehículo asignado (opcional)"
        options={[{ value: NO_VEHICLE_VALUE, label: 'Sin asignar' }, ...vehicleOptions]}
        error={errors.assignedVehicleId?.message}
        {...register('assignedVehicleId')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar chofer
      </Button>
    </form>
  )
}
