import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { PassengerSex } from '@/domain/enums/PassengerSex'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { LocationPickerMap } from '@/presentation/components/LocationPickerMap'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { DEFAULT_MAP_CENTER } from '@/shared/constants/app.constants'
import { PASSENGER_SEX_LABELS } from '@/shared/constants/passenger.constants'
import { toAppError } from '@/shared/errors/AppError'

import styles from './PassengerForm.module.css'

const PASSENGER_SEX_OPTIONS: readonly SelectOption[] = Object.values(PassengerSex).map((sex) => ({
  value: sex,
  label: PASSENGER_SEX_LABELS[sex],
}))

const passengerFormSchema = z.object({
  firstName: z.string().min(1, 'Ingresá el nombre.'),
  lastName: z.string().min(1, 'Ingresá el apellido.'),
  birthDate: z.string().optional(),
  sex: z.enum(PassengerSex).optional().or(z.literal('')),
  homeAddressStreet: z.string().min(1, 'Ingresá el domicilio.'),
  homeLatitude: z.number(),
  homeLongitude: z.number(),
  destinationAddressStreet: z.string().min(1, 'Ingresá el destino.'),
  destinationLatitude: z.number(),
  destinationLongitude: z.number(),
  guardianId: z.string().min(1, 'Seleccioná un tutor.'),
  operationalNotes: z.string().max(300).optional(),
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
      birthDate: '',
      sex: '',
      homeAddressStreet: '',
      homeLatitude: DEFAULT_MAP_CENTER.latitude,
      homeLongitude: DEFAULT_MAP_CENTER.longitude,
      destinationAddressStreet: '',
      destinationLatitude: DEFAULT_MAP_CENTER.latitude,
      destinationLongitude: DEFAULT_MAP_CENTER.longitude,
      guardianId: '',
      operationalNotes: '',
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
      await useCases.registerPassenger.execute({
        ...values,
        birthDate: values.birthDate ?? undefined,
        sex: values.sex === '' ? undefined : values.sex,
        operationalNotes: values.operationalNotes ?? undefined,
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
        label="Fecha de nacimiento (opcional)"
        type="date"
        error={errors.birthDate?.message}
        {...register('birthDate')}
      />
      <Select
        label="Sexo (opcional)"
        options={[{ value: '', label: 'Sin especificar' }, ...PASSENGER_SEX_OPTIONS]}
        error={errors.sex?.message}
        {...register('sex')}
      />

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

      <Input
        label="Observaciones operativas (opcional)"
        error={errors.operationalNotes?.message}
        {...register('operationalNotes')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar paciente
      </Button>
    </form>
  )
}
