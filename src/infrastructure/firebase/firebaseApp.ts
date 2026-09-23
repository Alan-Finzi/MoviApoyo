import { type FirebaseApp, getApps, initializeApp } from 'firebase/app'
import { type Auth, getAuth } from 'firebase/auth'
import { type Firestore, getFirestore } from 'firebase/firestore'

import { env } from '@/app/config/env'

// Punto único de inicialización del SDK cliente de Firebase. Solo se llama
// desde acá (nunca desde una pantalla) y solo tiene sentido invocarlo
// cuando `env.isFirebaseConfigured` es true — ver app/providers/dependencies.ts,
// que decide ahí si arma repositorios de Firestore o Mock.
let cachedApp: FirebaseApp | null = null

function getFirebaseApp(): FirebaseApp {
  if (cachedApp) return cachedApp
  cachedApp = getApps()[0] ?? initializeApp(env.firebase)
  return cachedApp
}

export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp())
}

export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp())
}
