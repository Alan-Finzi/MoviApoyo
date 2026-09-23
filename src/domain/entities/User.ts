import type { UserRole } from '@/domain/enums/UserRole'

// Sesión mínima necesaria para que ProtectedRoute/RoleGuard funcionen.
export interface AuthenticatedUser {
  readonly id: string
  readonly fullName: string
  readonly role: UserRole
}

// Estado de sesión que expone AuthRepository.observeAuthState. Distingue
// "no hay sesión" de "hay sesión de Firebase Auth pero todavía nadie le
// asignó un rol en /admins/{uid}" (ver docs/firebase.md) para que la UI
// pueda mostrar una pantalla distinta en cada caso en vez de tratarlas
// igual que "no autenticado".
export type AuthSession =
  | { readonly status: 'unauthenticated' }
  | { readonly status: 'pending-role'; readonly uid: string; readonly email: string }
  | { readonly status: 'authenticated'; readonly user: AuthenticatedUser }
