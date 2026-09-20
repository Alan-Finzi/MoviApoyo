import type { AuthenticatedUser } from '@/domain/entities/User'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'

import { currentUserStore } from './stores'

// No usa "async/await": el "almacenamiento" es síncrono (memoria), pero el
// contrato de AuthRepository devuelve Promise para que una futura
// implementación real (con red de por medio) no requiera cambiar la firma.
export class MockAuthRepository implements AuthRepository {
  getCurrentUser(): Promise<AuthenticatedUser> {
    return Promise.resolve(currentUserStore.getState())
  }

  setCurrentUser(user: AuthenticatedUser): Promise<void> {
    currentUserStore.setState(() => user)
    return Promise.resolve()
  }
}
