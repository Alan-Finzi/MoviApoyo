import type { AuthSession } from '@/domain/entities/User'
import type { UserRole } from '@/domain/enums/UserRole'

// Autenticación real (Firebase Auth) o Mock en memoria, según el entorno
// (ver app/providers/dependencies.ts y docs/firebase.md).
export interface AuthRepository {
  // Fuente de verdad de la sesión: AuthProvider se suscribe una única vez y
  // reacciona a login/logout sin hacer polling.
  observeAuthState(callback: (session: AuthSession) => void): () => void
  signIn(email: string, password: string): Promise<void>
  signInWithGoogle(): Promise<void>
  signOut(): Promise<void>
  // Solo lo implementa FirestoreAuthRepository: si signInWithGoogle tuvo que
  // caer a signInWithRedirect (popup bloqueado o mobile), el resultado (o el
  // error) llega recién en la carga siguiente de la página, no como
  // excepción de esa llamada. LoginPage lo consulta una vez al montar.
  checkRedirectResult?(): Promise<string | null>
  // Solo lo implementa MockAuthRepository: permite simular otro rol sin
  // login real, para poder navegar todas las vistas sin backend. Con
  // Firebase real este método no existe, y Topbar muestra en su lugar el
  // usuario autenticado y un botón de cerrar sesión.
  readonly setDemoRole?: (role: UserRole) => void
}
