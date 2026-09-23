import { useState } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { env } from '@/app/config/env'
import { authRepository } from '@/app/providers/dependencies'
import { Alert } from '@/presentation/components/Alert'
import { Button } from '@/presentation/components/Button'
import { Input } from '@/presentation/components/Input'
import { toAppError } from '@/shared/errors/AppError'

import styles from './LoginPage.module.css'

const loginFormSchema = z.object({
  email: z.string().min(1, 'Ingresá tu email.').email('Ingresá un email válido.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

type LoginFormValues = z.infer<typeof loginFormSchema>

// Única pantalla pública de la app: AuthProvider la muestra en vez del
// resto de la app mientras no haya una sesión de Firebase Auth (ver
// docs/firebase.md, "Pendiente: autenticación real"). Login de
// administrador/coordinador únicamente — choferes y padres/tutores nunca
// entran acá, interactúan por WhatsApp (ver docs/whatsapp-bot.md).
export function LoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await authRepository.signIn(values.email, values.password)
    } catch (error) {
      setSubmitError(toAppError(error).message)
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h1 className={styles.title}>{env.appName}</h1>
        <p className={styles.subtitle}>Ingresá con tu cuenta de administrador o coordinador.</p>

        <form
          className={styles.form}
          onSubmit={(event) => void handleSubmit(onSubmit)(event)}
          noValidate
        >
          {submitError && <Alert tone="danger">{submitError}</Alert>}

          <Input
            label="Email"
            type="email"
            autoComplete="username"
            error={errors.email?.message}
            {...register('email')}
          />
          <Input
            label="Contraseña"
            type="password"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" isLoading={isSubmitting}>
            Ingresar
          </Button>
        </form>
      </div>
    </div>
  )
}
