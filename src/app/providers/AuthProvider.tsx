import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import type { AuthenticatedUser } from '@/domain/entities/User'
import type { UserRole } from '@/domain/enums/UserRole'

import { authRepository } from './dependencies'

// Sesión global de la aplicación (rule 29 y rule 30). Es uno de los pocos
// casos donde Context API tiene sentido de verdad: el rol del usuario
// actual lo necesitan el layout, el sidebar y los RoleGuard de rutas
// completas, muy lejos entre sí en el árbol de componentes.
//
// No hay login real todavía: `setRole` existe para poder probar las
// distintas vistas (admin/coordinador) sin backend de autenticación.
interface AuthContextValue {
  readonly user: AuthenticatedUser
  readonly setRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null)

  useEffect(() => {
    authRepository
      .getCurrentUser()
      .then(setUser)
      .catch(() => {
        setUser(null)
      })
  }, [])

  const setRole = useCallback((role: UserRole) => {
    setUser((current) => {
      if (!current) return current
      const updated: AuthenticatedUser = { ...current, role }
      void authRepository.setCurrentUser(updated)
      return updated
    })
  }, [])

  // La sesión mock resuelve casi al instante; este null solo cubre ese
  // primer render (rule 27: no mostrar una pantalla a medio armar).
  if (!user) return null

  return <AuthContext.Provider value={{ user, setRole }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>.')
  }
  return context
}
