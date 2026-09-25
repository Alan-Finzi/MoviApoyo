import { useEffect, useState } from 'react'
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

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.81.54-1.85.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72A5.4 5.4 0 0 1 3.68 9c0-.6.1-1.18.29-1.72V4.95H.95A9 9 0 0 0 0 9c0 1.45.35 2.83.95 4.05l3.02-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .95 4.95l3.02 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}

// Única pantalla pública de la app: AuthProvider la muestra en vez del
// resto de la app mientras no haya una sesión de Firebase Auth (ver
// docs/firebase.md, "Autenticación real"). Login de administrador/
// coordinador únicamente — choferes y padres/tutores nunca entran acá,
// interactúan por WhatsApp (ver docs/whatsapp-bot.md).
export function LoginPage() {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: { email: '', password: '' },
  })

  // Si un intento anterior de "Entrar con Google" cayó a signInWithRedirect
  // (popup bloqueado o mobile), el resultado llega recién en esta carga de
  // página, no como excepción de esa llamada — por eso se consulta acá.
  useEffect(() => {
    void authRepository.checkRedirectResult?.().then((error) => {
      if (error) setSubmitError(error)
    })
  }, [])

  async function onSubmit(values: LoginFormValues): Promise<void> {
    setSubmitError(null)
    try {
      await authRepository.signIn(values.email, values.password)
    } catch (error) {
      setSubmitError(toAppError(error).message)
    }
  }

  async function handleGoogleSignIn(): Promise<void> {
    setSubmitError(null)
    setIsGoogleSubmitting(true)
    try {
      await authRepository.signInWithGoogle()
    } catch (error) {
      setSubmitError(toAppError(error).message)
    } finally {
      setIsGoogleSubmitting(false)
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

          <Button type="submit" className={styles.fullWidthButton} isLoading={isSubmitting}>
            Ingresar
          </Button>
        </form>

        <div className={styles.divider}>o</div>

        <Button
          type="button"
          variant="secondary"
          className={styles.fullWidthButton}
          icon={<GoogleIcon />}
          isLoading={isGoogleSubmitting}
          onClick={() => void handleGoogleSignIn()}
        >
          Entrar con Google
        </Button>
      </div>
    </div>
  )
}
