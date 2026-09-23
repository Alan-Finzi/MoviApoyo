import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { AuthenticatedUser, AuthSession } from '@/domain/entities/User'
import type { UserRole } from '@/domain/enums/UserRole'
import { LoadingState } from '@/presentation/components/LoadingState'
import { LoginPage } from '@/presentation/pages/auth/LoginPage'
import { PendingRolePage } from '@/presentation/pages/auth/PendingRolePage'

import { authRepository } from './dependencies'

// Sesión global de la aplicación. Es uno de los pocos casos donde Context
// API tiene sentido de verdad: el rol del usuario actual lo necesitan el
// layout, el sidebar y los RoleGuard de rutas completas, muy lejos entre sí
// en el árbol de componentes.
//
// `setDemoRole` solo existe cuando authRepository es el Mock (sin Firebase
// configurado): permite probar las distintas vistas sin backend de
// autenticación. Con Firebase real es `null` y Topbar muestra en su lugar
// el usuario autenticado + cerrar sesión.
interface AuthContextValue {
  readonly user: AuthenticatedUser
  readonly setDemoRole: ((role: UserRole) => void) | null
  readonly signOut: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null)

  useEffect(() => authRepository.observeAuthState(setSession), [])

  // Cubre el primer instante antes de que observeAuthState resuelva el
  // estado real (rule: no mostrar una pantalla a medio armar).
  if (!session) return <LoadingState message="Verificando sesión…" />

  if (session.status === 'unauthenticated') {
    return <LoginPage />
  }

  if (session.status === 'pending-role') {
    return <PendingRolePage email={session.email} uid={session.uid} />
  }

  const setDemoRole = authRepository.setDemoRole ?? null

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        setDemoRole,
        signOut: () => void authRepository.signOut(),
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return context
}
