import { LogOut } from 'lucide-react'

import { authRepository } from '@/app/providers/dependencies'
import { Button } from '@/presentation/components/Button'
import { Card } from '@/presentation/components/Card'

import styles from './PendingRolePage.module.css'

interface PendingRolePageProps {
  readonly email: string
  readonly uid: string
}

// Se muestra cuando Firebase Auth reconoce al usuario pero todavía no existe
// /admins/{uid} con su rol (ver docs/firebase.md): alguien tiene que crear
// ese documento a mano desde la consola de Firebase. Mostrar el UID acá
// evita tener que ir a buscarlo a Authentication > Users.
export function PendingRolePage({ email, uid }: PendingRolePageProps) {
  return (
    <div className={styles.page}>
      <Card className={styles.card}>
        <h1 className={styles.title}>Cuenta sin acceso asignado</h1>
        <p className={styles.text}>
          Tu cuenta (<strong>{email}</strong>) inició sesión correctamente, pero todavía no tiene un
          rol asignado en MoviApoyo.
        </p>
        <p className={styles.text}>
          Pedile a un administrador que cree el documento{' '}
          <code className={styles.code}>admins/{uid}</code> en Firestore con tu rol (
          <code className={styles.code}>ADMIN</code> o{' '}
          <code className={styles.code}>COORDINATOR</code>
          ).
        </p>
        <Button
          variant="secondary"
          icon={<LogOut size={16} aria-hidden="true" />}
          onClick={() => void authRepository.signOut()}
        >
          Cerrar sesión
        </Button>
      </Card>
    </div>
  )
}
