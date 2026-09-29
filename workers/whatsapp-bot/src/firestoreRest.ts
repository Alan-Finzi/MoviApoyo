import type { Env } from './types'

// Cliente mínimo de la API REST de Firestore (no la de Admin SDK, que
// depende de gRPC/Node y no corre en el runtime de Cloudflare Workers — ver
// README.md de esta carpeta). Se autentica como un usuario más de Firebase
// Authentication (un login dedicado para el bot, creado a mano en la
// consola de Firebase — ver README.md), igual que hace la web con
// admin/coordinador: las reglas de Firestore (`firestore.rules`) ya
// permiten leer/escribir a cualquier usuario logueado (`isSignedIn()`), así
// que no hace falta nada más. A propósito NO se usa una Service Account de
// Google Cloud: crearla exige entrar a la consola de Google Cloud, que en
// cuentas nuevas puede pedir cargar una tarjeta antes de dejar avanzar —
// esto lo evita del todo.

const IDENTITY_TOOLKIT_SIGN_IN_URL =
  'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword'

function databaseUrl(env: Env): string {
  return `https://firestore.googleapis.com/v1/projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents`
}

function fullResourceName(env: Env, path: string): string {
  return `projects/${env.FIREBASE_PROJECT_ID}/databases/(default)/documents/${path}`
}

// Cacheado en memoria del isolate (rule: no pedir un ID token nuevo en cada
// request si el anterior todavía vale — dura 1h, se renueva 1 min antes de
// vencer). Se pierde si Cloudflare recicla el isolate, sin problema: se
// vuelve a pedir solo.
let cachedToken: { readonly value: string; readonly expiresAtMs: number } | null = null

async function getIdToken(env: Env): Promise<string> {
  if (cachedToken && cachedToken.expiresAtMs > Date.now()) return cachedToken.value

  const response = await fetch(`${IDENTITY_TOOLKIT_SIGN_IN_URL}?key=${env.FIREBASE_WEB_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: env.WHATSAPP_BOT_EMAIL,
      password: env.WHATSAPP_BOT_PASSWORD,
      returnSecureToken: true,
    }),
  })
  if (!response.ok) {
    throw new Error(
      `No se pudo iniciar sesión como el usuario del bot: ${response.status.toString()} ${await response.text()}`,
    )
  }
  const data = (await response.json()) as { idToken: string; expiresIn: string }
  cachedToken = { value: data.idToken, expiresAtMs: Date.now() + (Number(data.expiresIn) - 60) * 1000 }
  return cachedToken.value
}

async function authedFetch(env: Env, url: string, init: RequestInit = {}): Promise<Response> {
  const token = await getIdToken(env)
  return fetch(url, {
    ...init,
    headers: { ...init.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })
}

// --- Conversión entre objetos JS planos y el formato tipado de Firestore
// (`{ fields: { clave: { stringValue: "..." } } }`) — ver
// https://firebase.google.com/docs/firestore/reference/rest/v1/Value. Solo
// cubre los tipos que este bot realmente escribe/lee (string, número,
// booleano, null, fecha ISO como timestamp, mapas y arrays anidados).
type FirestoreValue =
  | { readonly stringValue: string }
  | { readonly integerValue: string }
  | { readonly doubleValue: number }
  | { readonly booleanValue: boolean }
  | { readonly nullValue: null }
  | { readonly timestampValue: string }
  | { readonly mapValue: { readonly fields?: Record<string, FirestoreValue> } }
  | { readonly arrayValue: { readonly values?: readonly FirestoreValue[] } }

// Marcador para fechas que deben guardarse como el tipo nativo "timestamp"
// de Firestore (no como string) — ver toFirestoreTimestamp() más abajo. Se
// necesita como wrapper porque, a diferencia de un Admin SDK con clase
// `Timestamp` propia, acá todo lo que no sea string/number/boolean/null se
// trata como mapa anidado por defecto.
export class FirestoreTimestamp {
  constructor(readonly iso: string) {}
}

export function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null }
  if (value instanceof FirestoreTimestamp) return { timestampValue: value.iso }
  if (typeof value === 'string') return { stringValue: value }
  if (typeof value === 'boolean') return { booleanValue: value }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? { integerValue: value.toString() } : { doubleValue: value }
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } }
  if (typeof value === 'object') {
    return { mapValue: { fields: toFirestoreFields(value as Record<string, unknown>) } }
  }
  throw new Error(`Tipo no soportado para Firestore: ${typeof value}`)
}

export function toFirestoreFields(obj: Record<string, unknown>): Record<string, FirestoreValue> {
  const fields: Record<string, FirestoreValue> = {}
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue
    fields[key] = toFirestoreValue(value)
  }
  return fields
}

// Fecha ISO (la misma convención que usa el resto del código, ver
// shared/utils/date.ts del lado de la web) guardada como timestamp nativo
// de Firestore en vez de string — mismo tipo que ya usaba `Timestamp.now()`
// en la versión con Admin SDK. Usar dentro de un objeto `data` pasado a
// createDocument/patchDocument, nunca sueltos.
export function toFirestoreTimestamp(iso: string): FirestoreTimestamp {
  return new FirestoreTimestamp(iso)
}

function fromFirestoreValue(value: FirestoreValue): unknown {
  if ('stringValue' in value) return value.stringValue
  if ('integerValue' in value) return Number(value.integerValue)
  if ('doubleValue' in value) return value.doubleValue
  if ('booleanValue' in value) return value.booleanValue
  if ('nullValue' in value) return null
  if ('timestampValue' in value) return value.timestampValue
  if ('mapValue' in value) return fromFirestoreFields(value.mapValue.fields)
  if ('arrayValue' in value) return (value.arrayValue.values ?? []).map(fromFirestoreValue)
  return null
}

export function fromFirestoreFields(
  fields: Record<string, FirestoreValue> | undefined,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(fields ?? {})) {
    result[key] = fromFirestoreValue(value)
  }
  return result
}

export interface FirestoreDocument {
  readonly id: string
  readonly data: Record<string, unknown>
}

function idFromName(name: string): string {
  return name.split('/').at(-1) ?? name
}

export async function getDocument(env: Env, path: string): Promise<FirestoreDocument | null> {
  const response = await authedFetch(env, `${databaseUrl(env)}/${path}`)
  if (response.status === 404) return null
  if (!response.ok) {
    throw new Error(`Firestore getDocument(${path}) falló: ${response.status.toString()} ${await response.text()}`)
  }
  const data = (await response.json()) as { name: string; fields?: Record<string, FirestoreValue> }
  return { id: idFromName(data.name), data: fromFirestoreFields(data.fields) }
}

// Actualización parcial (equivalente a `.update()` del Admin SDK): solo
// toca los campos pasados en `data`, nunca reemplaza el documento entero.
export async function patchDocument(
  env: Env,
  path: string,
  data: Record<string, unknown>,
): Promise<void> {
  const mask = Object.keys(data)
    .map((key) => `updateMask.fieldPaths=${encodeURIComponent(key)}`)
    .join('&')
  const response = await authedFetch(env, `${databaseUrl(env)}/${path}?${mask}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  })
  if (!response.ok) {
    throw new Error(`Firestore patchDocument(${path}) falló: ${response.status.toString()} ${await response.text()}`)
  }
}

// Crea un documento nuevo. Con `docId` falla con 409 si ya existe (mismo
// comportamiento que `.create()` del Admin SDK, usado por dedupe.ts para la
// idempotencia); sin `docId`, Firestore genera uno random (igual que
// `.add()`). Devuelve `null` en el caso "ya existía" en vez de tirar el
// error, para que el llamador decida qué hacer sin try/catch por código de
// error.
export async function createDocument(
  env: Env,
  collectionPath: string,
  data: Record<string, unknown>,
  docId?: string,
): Promise<FirestoreDocument | null> {
  const url = docId
    ? `${databaseUrl(env)}/${collectionPath}?documentId=${encodeURIComponent(docId)}`
    : `${databaseUrl(env)}/${collectionPath}`
  const response = await authedFetch(env, url, {
    method: 'POST',
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  })
  if (response.status === 409) return null
  if (!response.ok) {
    throw new Error(
      `Firestore createDocument(${collectionPath}) falló: ${response.status.toString()} ${await response.text()}`,
    )
  }
  const created = (await response.json()) as { name: string; fields?: Record<string, FirestoreValue> }
  return { id: idFromName(created.name), data: fromFirestoreFields(created.fields) }
}

// Reemplaza el documento entero, creándolo si no existe (equivalente a
// `.set()` del Admin SDK) — a diferencia de patchDocument, no lleva
// updateMask: sin ese parámetro, Firestore reemplaza todo el documento en
// vez de mezclar solo los campos dados.
export async function setDocument(env: Env, path: string, data: Record<string, unknown>): Promise<void> {
  const response = await authedFetch(env, `${databaseUrl(env)}/${path}`, {
    method: 'PATCH',
    body: JSON.stringify({ fields: toFirestoreFields(data) }),
  })
  if (!response.ok) {
    throw new Error(`Firestore setDocument(${path}) falló: ${response.status.toString()} ${await response.text()}`)
  }
}

export async function deleteDocument(env: Env, path: string): Promise<void> {
  const response = await authedFetch(env, `${databaseUrl(env)}/${path}`, { method: 'DELETE' })
  if (!response.ok && response.status !== 404) {
    throw new Error(`Firestore deleteDocument(${path}) falló: ${response.status.toString()} ${await response.text()}`)
  }
}

// Agrega un valor a un array de un documento existente de forma atómica del
// lado de Firestore (equivalente a `FieldValue.arrayUnion(...)` del Admin
// SDK) — se usa para Trip.events, que varios mensajes de WhatsApp podrían
// tocar en paralelo.
export async function appendToArray(
  env: Env,
  path: string,
  fieldPath: string,
  value: unknown,
): Promise<void> {
  const response = await authedFetch(env, `${databaseUrl(env)}:commit`, {
    method: 'POST',
    body: JSON.stringify({
      writes: [
        {
          transform: {
            document: fullResourceName(env, path),
            fieldTransforms: [
              { fieldPath, appendMissingElements: { values: [toFirestoreValue(value)] } },
            ],
          },
        },
      ],
    }),
  })
  if (!response.ok) {
    throw new Error(`Firestore appendToArray(${path}) falló: ${response.status.toString()} ${await response.text()}`)
  }
}

// Subconjunto de "structured query" de Firestore que este bot necesita —
// ver https://firebase.google.com/docs/firestore/reference/rest/v1/StructuredQuery.
// Se pasa tal cual (sin un DSL propio) porque cada consulta la arma quien la
// usa (identity.ts, whatsappWebhook.ts, sendPendingNotifications.ts) y son
// pocas.
export interface StructuredQuery {
  readonly from: readonly { readonly collectionId: string }[]
  readonly where?: unknown
  readonly orderBy?: readonly {
    readonly field: { readonly fieldPath: string }
    readonly direction: 'ASCENDING' | 'DESCENDING'
  }[]
  readonly limit?: number
}

export function fieldEquals(fieldPath: string, value: unknown): unknown {
  return { fieldFilter: { field: { fieldPath }, op: 'EQUAL', value: toFirestoreValue(value) } }
}

export function fieldIn(fieldPath: string, values: readonly unknown[]): unknown {
  return {
    fieldFilter: {
      field: { fieldPath },
      op: 'IN',
      value: { arrayValue: { values: values.map(toFirestoreValue) } },
    },
  }
}

export function and(...filters: readonly unknown[]): unknown {
  return { compositeFilter: { op: 'AND', filters } }
}

// Las consultas de este bot son siempre sobre colecciones raíz (drivers,
// guardians, trips, notifications) — por eso no recibe un "parent" propio:
// según la API REST de Firestore, para una colección raíz el `parent` de
// `:runQuery` es la propia raíz de documentos (sin path extra), y
// `structuredQuery.from` ya indica de qué colección se trata.
export async function runQuery(
  env: Env,
  structuredQuery: StructuredQuery,
): Promise<readonly FirestoreDocument[]> {
  const response = await authedFetch(env, `${databaseUrl(env)}:runQuery`, {
    method: 'POST',
    body: JSON.stringify({ structuredQuery }),
  })
  if (!response.ok) {
    throw new Error(`Firestore runQuery falló: ${response.status.toString()} ${await response.text()}`)
  }
  const rows = (await response.json()) as readonly {
    readonly document?: { readonly name: string; readonly fields?: Record<string, FirestoreValue> }
  }[]
  return rows
    .filter((row): row is { document: NonNullable<(typeof rows)[number]['document']> } =>
      Boolean(row.document),
    )
    .map((row) => ({ id: idFromName(row.document.name), data: fromFirestoreFields(row.document.fields) }))
}
