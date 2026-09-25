import type { AuthSession } from '@/domain/entities/User'
import type { UserRole } from '@/domain/enums/UserRole'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'

import { currentUserStore } from './stores'

// Sin backend de autenticación: la sesión "actual" es el usuario en memoria
// de currentUserStore, autenticado desde el arranque. signIn/signOut no
// hacen nada real (no hay pantalla de login en este modo, ver AuthProvider).
export class MockAuthRepository implements AuthRepository {
  observeAuthState(callback: (session: AuthSession) => void): () => void {
    callback({ status: 'authenticated', user: currentUserStore.getState() })
    return currentUserStore.subscribe(() => {
      callback({ status: 'authenticated', user: currentUserStore.getState() })
    })
  }

  signIn(): Promise<void> {
    return Promise.resolve()
  }

  signInWithGoogle(): Promise<void> {
    return Promise.resolve()
  }

  signOut(): Promise<void> {
    return Promise.resolve()
  }

  setDemoRole(role: UserRole): void {
    currentUserStore.setState((current) => ({ ...current, role }))
  }
}
