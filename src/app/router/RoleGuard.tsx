import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/app/providers/AuthProvider'
import type { UserRole } from '@/domain/enums/UserRole'
import { ROUTES } from '@/shared/constants/routes.constants'

interface RoleGuardProps {
  readonly allowedRoles: readonly UserRole[]
  readonly children: ReactNode
}

// A diferencia de ProtectedRoute, esto sí tiene efecto ya: el selector de
// rol del header (ver Topbar) cambia el usuario simulado, y estas rutas
// reaccionan de inmediato (rule 29 y 30).
export function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { user } = useAuth()
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={ROUTES.DASHBOARD} replace />
  }
  return children
}
