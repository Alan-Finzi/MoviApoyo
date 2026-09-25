import { FirebaseError } from 'firebase/app'
import {
  type Auth,
  type AuthError,
  GoogleAuthProvider,
  getRedirectResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
} from 'firebase/auth'
import { type Firestore, doc, getDoc } from 'firebase/firestore'

import type { AuthSession } from '@/domain/entities/User'
import { UserRole } from '@/domain/enums/UserRole'
import type { AuthRepository } from '@/domain/repositories/AuthRepository'
import {
  NetworkError,
  toAppError,
  UnexpectedError,
  ValidationError,
} from '@/shared/errors/AppError'

const ADMINS_COLLECTION = 'admins'

function isUserRole(value: unknown): value is UserRole {
  return typeof value === 'string' && (Object.values(UserRole) as string[]).includes(value)
}

// `customData.email` solo lo trae el SDK en errores de Auth (no en cualquier
// FirebaseError) — ver AuthError en firebase/auth.
function isAuthError(error: FirebaseError): error is AuthError {
  return 'customData' in error
}

// signInWithPopup en un navegador/dispositivo mobile suele fallar o degradar
// mal (Safari/Chrome mobile bloquean o cierran el popup solos); ahí conviene
// ir directo a signInWithRedirect en vez de intentar el popup primero.
function isMobileUserAgent(): boolean {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
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
    if (error.code === 'auth/account-exists-with-different-credential') {
      const email = isAuthError(error) ? error.customData.email : undefined
      return new ValidationError(
        email
          ? `Ya existe una cuenta con ${email} usando email y contraseña. Iniciá sesión con esa opción.`
          : 'Ya existe una cuenta con ese email usando contraseña. Iniciá sesión con email y contraseña.',
      )
    }
    if (error.code === 'auth/network-request-failed') {
      return new NetworkError(
        'No se pudo conectar. Revisá tu conexión a internet e intentá de nuevo.',
      )
    }
    return new UnexpectedError('No se pudo iniciar sesión. Intentá de nuevo.', { cause: error })
  }
  return toAppError(error)
}

// Autenticación real: Firebase Auth resuelve QUIÉN es (email/contraseña o
// Google), y el rol de esa persona (ADMIN/COORDINATOR) vive en Firestore, en
// /admins/{uid} — un documento que solo se puede crear/editar a mano desde
// la consola (ver firestore.rules: ningún cliente puede escribirlo, ni
// siquiera el propio usuario). Esto es igual sin importar el proveedor: el
// chequeo de rol usa solo firebaseUser.uid, así que entrar con Google no le
// da acceso a nadie que no tenga ya su /admins/{uid}. Si Firebase Auth
// reconoce al usuario pero no existe ese documento, la sesión queda
// "pending-role" en vez de "authenticated": inició sesión, pero todavía
// nadie le asignó acceso.
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

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider()
    provider.setCustomParameters({ prompt: 'select_account' })

    if (isMobileUserAgent()) {
      await signInWithRedirect(this.auth, provider)
      return
    }

    try {
      await signInWithPopup(this.auth, provider)
    } catch (error) {
      if (error instanceof FirebaseError) {
        // El usuario se arrepintió y cerró el popup: no es un error real,
        // no hay nada que mostrarle.
        if (error.code === 'auth/popup-closed-by-user') return
        // El navegador bloqueó el popup (varía según configuración/extensiones):
        // reintentar con redirect en vez de fallar directamente.
        if (error.code === 'auth/popup-blocked') {
          await signInWithRedirect(this.auth, provider)
          return
        }
      }
      throw toSignInError(error)
    }
  }

  // El resultado (o error) de un signInWithRedirect llega recién acá, en la
  // carga de página siguiente — nunca como excepción de signInWithGoogle.
  // Si no hubo redirect pendiente, getRedirectResult resuelve null sin
  // hacer nada (no-op).
  async checkRedirectResult(): Promise<string | null> {
    try {
      await getRedirectResult(this.auth)
      return null
    } catch (error) {
      return toSignInError(error).message
    }
  }

  async signOut(): Promise<void> {
    await firebaseSignOut(this.auth)
  }
}
