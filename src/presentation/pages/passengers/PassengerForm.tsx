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

import styles from './PassengerForm.module.css'

const passengerFormSchema = z.object({
  firstName: z.string().min(1, 'Ingresá el nombre.'),
  lastName: z.string().min(1, 'Ingresá el apellido.'),
  homeAddressStreet: z.string().min(1, 'Ingresá el domicilio.'),
  homeLatitude: z.coerce.number({ message: 'Ingresá una latitud válida.' }),
  homeLongitude: z.coerce.number({ message: 'Ingresá una longitud válida.' }),
  destinationAddressStreet: z.string().min(1, 'Ingresá el destino.'),
  destinationLatitude: z.coerce.number({ message: 'Ingresá una latitud válida.' }),
  destinationLongitude: z.coerce.number({ message: 'Ingresá una longitud válida.' }),
  guardianId: z.string().min(1, 'Seleccioná un tutor.'),
})

// z.coerce.number() en los campos de coordenadas: mismo patrón dual
// input/output que el resto de los formularios con inputs numéricos.
type PassengerFormInput = z.input<typeof passengerFormSchema>
type PassengerFormOutput = z.output<typeof passengerFormSchema>

interface PassengerFormProps {
  readonly guardianOptions: readonly SelectOption[]
  readonly onRegistered: () => void
}

// Alta de paciente (rule: "agregar pacientes"). El tutor se elige entre los
// que ya existen — el alta de tutores nuevos queda fuera de este alcance.
export function PassengerForm({ guardianOptions, onRegistered }: PassengerFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PassengerFormInput, unknown, PassengerFormOutput>({
    resolver: zodResolver(passengerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      homeAddressStreet: '',
      homeLatitude: 0,
      homeLongitude: 0,
      destinationAddressStreet: '',
      destinationLatitude: 0,
      destinationLongitude: 0,
      guardianId: '',
    },
  })

  async function onSubmit(values: PassengerFormOutput): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerPassenger.execute(values)
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

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Domicilio</span>
        <Input
          label="Dirección"
          error={errors.homeAddressStreet?.message}
          {...register('homeAddressStreet')}
        />
        <div className={styles.coordinatesRow}>
          <Input
            label="Latitud"
            type="number"
            step="any"
            error={errors.homeLatitude?.message}
            {...register('homeLatitude')}
          />
          <Input
            label="Longitud"
            type="number"
            step="any"
            error={errors.homeLongitude?.message}
            {...register('homeLongitude')}
          />
        </div>
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Destino</span>
        <Input
          label="Dirección"
          error={errors.destinationAddressStreet?.message}
          {...register('destinationAddressStreet')}
        />
        <div className={styles.coordinatesRow}>
          <Input
            label="Latitud"
            type="number"
            step="any"
            error={errors.destinationLatitude?.message}
            {...register('destinationLatitude')}
          />
          <Input
            label="Longitud"
            type="number"
            step="any"
            error={errors.destinationLongitude?.message}
            {...register('destinationLongitude')}
          />
        </div>
      </div>

      <Select
        label="Padre/Tutor"
        options={guardianOptions}
        error={errors.guardianId?.message}
        {...register('guardianId')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar paciente
      </Button>
    </form>
  )
}
