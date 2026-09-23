import { FirebaseError } from 'firebase/app'
import {
  type Auth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { type Firestore, doc, getDoc } from 'firebase/firestore'

import type { AuthSession } from '@/domain/entities/User'
import { UserRole } from '@/domain/enums/UserRole'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'
import { toAppError, UnexpectedError, ValidationError } from '@/shared/errors/AppError'

const ADMINS_COLLECTION = 'admins'

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (Object.values(UserRole) as string[]).includes(value)
}

function toSignInError(error: unknown) {
  if (error instanceof FirebaseError) {
    if (
      error.code === 'auth/invalid-credential' ||
      error.code === 'auth/wrong-password' ||
      error.code === 'auth/user-not-found' ||
      error.code === 'auth/invalid-email'
    ) {
      return new ValidationError('Email o contraseña incorrectos.')
    }
    if (error.code === 'auth/too-many-requests') {
      return new ValidationError('Demasiados intentos fallidos. Probá de nuevo en unos minutos.')
    }
    return new UnexpectedError('No se pudo iniciar sesión. Intentá de nuevo.', { cause: error })
  }
  return toAppError(error)
}

// Autenticación real: Firebase Auth resuelve QUIÉN es (email/contraseña), y
// el rol de esa persona (ADMIN/COORDINATOR) vive en Firestore, en
// /admins/{uid} — un documento que solo se puede crear/editar a mano desde
// la consola (ver firestore.rules: ningún cliente puede escribirlo, ni
// siquiera el propio usuario). Si Firebase Auth reconoce al usuario pero no
// existe ese documento, la sesión queda "pending-role" en vez de
// "authenticated": inició sesión, pero todavía nadie le asignó acceso.
export class FirestoreAuthRepository implements AuthRepository {
  constructor(
    private readonly auth: Auth,
    private readonly firestore: Firestore,
  ) {}

  observeAuthState(callback: (session: AuthSession) => void): () => void {
    return onAuthStateChanged(this.auth, (firebaseUser) => {
      if (!firebaseUser) {
        callback({ status: 'unauthenticated' })
        return
      }

      void this.resolveRole(firebaseUser.uid).then((role) => {
        if (!role) {
          callback({
            status: 'pending-role',
            uid: firebaseUser.uid,
            email: firebaseUser.email ?? '',
          })
          return
        }
        callback({
          status: 'authenticated',
          user: {
            id: firebaseUser.uid,
            fullName: firebaseUser.displayName || firebaseUser.email || 'Usuario',
            role,
          },
        })
      })
    })
  }

  private async resolveRole(uid: string): Promise<UserRole | null> {
    const snapshot = await getDoc(doc(this.firestore, ADMINS_COLLECTION, uid))
    if (!snapshot.exists()) return null
    const role: unknown = snapshot.data().role
    return isUserRole(role) ? role : null
  }

  async signIn(email: string, password: string): Promise<void> {
    try {
      await signInWithEmailAndPassword(this.auth, email, password)
    } catch (error) {
      throw toSignInError(error)
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth)
  }
}
