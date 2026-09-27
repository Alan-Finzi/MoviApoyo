import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { useCases } from '@/app/providers/dependencies'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { toAppError } from '@/shared/errors/AppError'

import styles from './GuardianForm.module.css'

const guardianFormSchema = z.object({
  fullName: z.string().min(1, 'Ingresá el nombre completo.'),
  phone: z.string().min(1, 'Ingresá el teléfono.'),
  relationship: z.string().min(1, 'Ingresá el vínculo (ej. Madre, Padre, Tutor legal).'),
})

type GuardianFormValues = z.infer<typeof guardianFormSchema>

interface GuardianFormProps {
  readonly onRegistered: () => void
}

// Alta de tutor (rule: "agregar tutores"). Arranca notificado por WhatsApp,
// el único canal soportado hoy (ver RegisterGuardianUseCase).
export function GuardianForm({ onRegistered }: GuardianFormProps) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<GuardianFormValues>({
    resolver: zodResolver(guardianFormSchema),
    defaultValues: {
      fullName: '',
      phone: '',
      relationship: '',
    },
  })

  async function onSubmit(values: GuardianFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await useCases.registerGuardian.execute(values)
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

      <Input label="Nombre completo" error={errors.fullName?.message} {...register('fullName')} />
      <Input
        label="Teléfono"
        placeholder="+549351..."
        hint="Incluí el código de país, ej. +549351..."
        error={errors.phone?.message}
        {...register('phone')}
      />
      <Input
        label="Vínculo"
        placeholder="Ej. Madre, Padre, Tutor legal"
        error={errors.relationship?.message}
        {...register('relationship')}
      />

      <Button type="submit" isLoading={isSubmitting}>
        Guardar tutor
      </Button>
    </form>
  )
}
