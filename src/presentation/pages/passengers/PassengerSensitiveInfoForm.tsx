import { useEffect, useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import type { PassengerSensitiveInfo } from '@/domain/entities/Passenger'
import { PassengerBloodType } from '@/domain/enums/PassengerBloodType'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { Select, type SelectOption } from '@/presentation/components/Select'
import { PASSENGER_BLOOD_TYPE_LABELS } from '@/shared/constants/passenger.constants'
import { toAppError } from '@/shared/errors/AppError'

import styles from './PassengerSensitiveInfoForm.module.css'

const BLOOD_TYPE_OPTIONS: readonly SelectOption[] = Object.values(PassengerBloodType).map(
  (type) => ({ value: type, label: PASSENGER_BLOOD_TYPE_LABELS[type] }),
)

const sensitiveInfoFormSchema = z.object({
  documentNumber: z.string().max(20).optional(),
  bloodType: z.enum(PassengerBloodType).optional().or(z.literal('')),
  allergiesText: z.string().max(300).optional(),
  medicalNotes: z.string().max(500).optional(),
  observations: z.string().max(500).optional(),
})

type SensitiveInfoFormValues = z.infer<typeof sensitiveInfoFormSchema>

interface PassengerSensitiveInfoFormProps {
  readonly passengerId: string
  readonly initialValues: PassengerSensitiveInfo | null
  readonly onSaved: (info: PassengerSensitiveInfo) => void
}

// Carga/edición de información sensible (DNI, grupo sanguíneo, alergias,
// notas médicas). Separado a propósito del alta general del paciente
// (mismo criterio que GetPassengerSensitiveInfoUseCase, rule 12): es una
// acción explícita, disponible solo detrás de "Ver información sensible".
export function PassengerSensitiveInfoForm({
  passengerId,
  initialValues,
  onSaved,
}: PassengerSensitiveInfoFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SensitiveInfoFormValues>({
    resolver: zodResolver(sensitiveInfoFormSchema),
    defaultValues: {
      documentNumber: initialValues?.documentNumber ?? '',
      bloodType: initialValues?.bloodType ?? '',
      allergiesText: initialValues?.allergies?.join(', ') ?? '',
      medicalNotes: initialValues?.medicalNotes ?? '',
      observations: initialValues?.observations ?? '',
    },
  })

  // El <dialog> del Modal que envuelve este formulario monta el componente
  // una sola vez y lo reutiliza (no lo desmonta al cerrar) — defaultValues
  // de react-hook-form no es reactivo, así que sin este reset() el
  // formulario queda con los valores (vacíos) de la primera vez que se
  // montó, aunque initialValues llegue después con datos reales.
  useEffect(() => {
    reset({
      documentNumber: initialValues?.documentNumber ?? '',
      bloodType: initialValues?.bloodType ?? '',
      allergiesText: initialValues?.allergies?.join(', ') ?? '',
      medicalNotes: initialValues?.medicalNotes ?? '',
      observations: initialValues?.observations ?? '',
    })
  }, [initialValues, reset])

  async function onSubmit(values: SensitiveInfoFormValues): Promise<void> {
    setSubmitError(null)
    try {
      const allergies = (values.allergiesText ?? '')
        .split(',')
        .map((item) => item.trim())
        .filter((item) => item.length > 0)

      const info = await useCases.updatePassengerSensitiveInfo.execute({
        passengerId,
        documentNumber: values.documentNumber || undefined,
        bloodType: values.bloodType === '' ? undefined : values.bloodType,
        allergies: allergies.length > 0 ? allergies : undefined,
        medicalNotes: values.medicalNotes || undefined,
        observations: values.observations || undefined,
      })
      onSaved(info)
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
        label="Documento (DNI)"
        error={errors.documentNumber?.message}
        {...register('documentNumber')}
      />

      <Select
        label="Grupo sanguíneo (opcional)"
        options={[{ value: '', label: 'Sin especificar' }, ...BLOOD_TYPE_OPTIONS]}
        error={errors.bloodType?.message}
        {...register('bloodType')}
      />

      <Input
        label="Alergias (separadas por coma)"
        placeholder="Ej. Penicilina, Frutos secos"
        error={errors.allergiesText?.message}
        {...register('allergiesText')}
      />

      <Input
        label="Notas médicas"
        error={errors.medicalNotes?.message}
        {...register('medicalNotes')}
      />

      <Input
        label="Observaciones"
        error={errors.observations?.message}
        {...register('observations')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar información sensible
      </Button>
    </form>
  )
}
