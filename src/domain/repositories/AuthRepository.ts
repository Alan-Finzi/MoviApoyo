import type { AuthenticatedUser } from '@/domain/entities/User'

// No hay backend de autenticación todavía (rule 29): esta interfaz alcanza
// para que ProtectedRoute/RoleGuard funcionen ya, y se reemplaza más
// adelante por una implementación real sin tocar la UI.
export interface AuthRepository {
  getCurrentUser(): Promise<AuthenticatedUser>
  setCurrentUser(user: AuthenticatedUser): Promise<void>
}
