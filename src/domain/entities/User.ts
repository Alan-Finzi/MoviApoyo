import type { UserRole } from '@/domain/enums/UserRole'

// Sesión mínima necesaria para que ProtectedRoute/RoleGuard funcionen ya.
// No hay backend de autenticación todavía: la implementación concreta de
// AuthRepository (mock) es la que decide qué usuario "está logueado".
export interface AuthenticatedUser {
  readonly id: string
  readonly fullName: string
  readonly role: UserRole
}
