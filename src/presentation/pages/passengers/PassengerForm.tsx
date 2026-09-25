import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { LocationPickerMap } from '@/presentation/components/LocationPickerMap'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { DEFAULT_MAP_CENTER } from '@/shared/constants/app.constants'
import { toAppError } from '@/shared/errors/AppError'

import styles from './PassengerForm.module.css'

const passengerFormSchema = z.object({
  firstName: z.string().min(1, 'Ingresá el nombre.'),
  lastName: z.string().min(1, 'Ingresá el apellido.'),
  homeAddressStreet: z.string().min(1, 'Ingresá el domicilio.'),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  destinationAddressStreet: z.string().min(1, 'Ingresá el destino.'),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  guardianId: z.string().min(1, 'Seleccioná un tutor.'),
})

type PassengerFormValues = z.infer<typeof passengerFormSchema>

interface PassengerFormProps {
  readonly guardianOptions: readonly SelectOption[]
  readonly onRegistered: () => void
}

// Alta de paciente (rule: "agregar pacientes"). El tutor se elige entre los
// que ya existen — el alta de tutores nuevos queda fuera de este alcance.
// El domicilio/destino se marcan tocando un mapa real (LocationPickerMap,
// OpenStreetMap) en vez de tipear latitud/longitud a mano.
export function PassengerForm({ guardianOptions, onRegistered }: PassengerFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<PassengerFormValues>({
    resolver: zodResolver(passengerFormSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      homeAddressStreet: '',
      homeLatitude: DEFAULT_MAP_CENTER.latitude,
      homeLongitude: DEFAULT_MAP_CENTER.longitude,
      destinationAddressStreet: '',
      destinationLatitude: DEFAULT_MAP_CENTER.latitude,
      destinationLongitude: DEFAULT_MAP_CENTER.longitude,
      guardianId: '',
    },
  })

  const homeLocation = { latitude: watch('homeLatitude'), longitude: watch('homeLongitude') }
  const destinationLocation = {
    latitude: watch('destinationLatitude'),
    longitude: watch('destinationLongitude'),
  }

  async function onSubmit(values: PassengerFormValues): Promise<void> {
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
        <LocationPickerMap
          location={homeLocation}
          onChange={(location) => {
            setValue('homeLatitude', location.latitude)
            setValue('homeLongitude', location.longitude)
          }}
        />
      </div>

      <div className={styles.fieldGroup}>
        <span className={styles.groupTitle}>Destino</span>
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
      </div>

      <Select
        label="Padre/Tutor"
        options={[{ value: '', label: 'Seleccioná un tutor…' }, ...guardianOptions]}
        error={errors.guardianId?.message}
        {...register('guardianId')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar paciente
      </Button>
    </form>
  )
}
