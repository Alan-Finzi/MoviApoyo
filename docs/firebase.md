# Backend en Firebase

MoviApoyo usa Firebase como backend: Firestore para guardar traslados,
choferes, vehículos, pacientes, tutores, incidentes, notificaciones y
configuración; Cloud Functions para el webhook de WhatsApp
([`docs/whatsapp-bot.md`](whatsapp-bot.md)). Este documento es la guía para
levantar tu propio proyecto de Firebase y conectarlo.

## Cómo decide la app si usa Firestore o los Mocks

`src/app/config/env.ts` expone `env.isFirebaseConfigured`, que es `true`
únicamente cuando `VITE_FIREBASE_PROJECT_ID` está definido. El composition
root (`src/app/providers/dependencies.ts`) arma los repositorios de
Firestore o los Mock en memoria según ese valor — **no hay que tocar código
para activar Firebase**, solo completar el `.env` correspondiente. Mientras
no lo completes, `npm run dev` sigue funcionando exactamente igual que
hasta ahora.

## 1. Crear el proyecto de Firebase

Esto lo tenés que hacer vos en https://console.firebase.google.com (requiere
tu cuenta de Google — no es algo que se pueda hacer por código):

1. "Agregar proyecto" → elegí un nombre (ej. `moviapoyo` o `moviapoyo-dev`
   para un entorno separado de `moviapoyo-prod`).
2. Dentro del proyecto, activá **Firestore Database** (modo producción, la
   región más cercana — ej. `southamerica-east1`).
3. Activá **Authentication** si vas a agregar login real de
   administrador/coordinador (no incluido en este cambio, ver
   [Pendiente: autenticación real](#pendiente-autenticación-real)).
4. En **Configuración del proyecto > Tus apps**, agregá una app **Web** y
   copiá el objeto de configuración (`apiKey`, `authDomain`, `projectId`,
   etc.).

## 2. Completar las variables de entorno

Copiá esos valores a **`.env.development.local`** (creá el archivo si no
existe). Empieza con `.env.` y termina en `.local`, así que ya está en
`.gitignore` — nunca se sube al repo. Vite lo carga con más prioridad que
`.env.development`, así que estos valores pisan los placeholders vacíos que
sí están versionados ahí:

```
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

No son secretos en el sentido estricto (viajan igual al bundle del cliente,
protegidos por `firestore.rules` y no por estar ocultos), pero de todas
formas no se versionan: así cada quien usa su propio proyecto de Firebase
sin pisar el de otro, y el repo no queda atado a un proyecto específico. En
**Netlify** (o el hosting que uses para producción), esto se resuelve
cargando las mismas variables en **Site settings → Environment variables**
del sitio, no en un archivo del repo.

## 3. Instalar el CLI de Firebase y asociar el proyecto

```bash
npm install -g firebase-tools
firebase login
```

Editá `.firebaserc` en la raíz del repo y reemplazá
`REEMPLAZAR-CON-TU-PROJECT-ID` por el Project ID real (el mismo que pusiste
en `VITE_FIREBASE_PROJECT_ID`).

## 4. Desplegar las reglas de seguridad de Firestore

```bash
firebase deploy --only firestore:rules
```

Las reglas actuales (`firestore.rules`) son intencionalmente simples para
este MVP: cualquier usuario autenticado puede leer y escribir. Como
choferes y padres nunca acceden a Firestore directamente (todo pasa por
WhatsApp → Cloud Function con el Admin SDK, que no pasa por estas reglas),
alcanza por ahora. El comentario dentro del archivo explica cómo
endurecerlas más adelante.

> **⚠️ Estado real del proyecto `moviapoyo`**: el CLI de Firebase ya está
> instalado como devDependency del repo (`npx firebase --version`) y las
> reglas reales de `firestore.rules` (`isSignedIn()`) ya fueron desplegadas
> con `npx firebase deploy --only firestore:rules`, reemplazando las reglas
> temporales abiertas que se habían publicado a mano desde la consola. Esto
> significa que **la app no puede leer ni escribir en Firestore hasta que
> exista Firebase Authentication real** (ver
> [Pendiente: autenticación real](#pendiente-autenticación-real)), porque
> hoy el login sigue siendo `MockAuthRepository` y `request.auth` siempre es
> `null`. Es un estado intencional: se priorizó dejar el proyecto seguro por
> sobre poder probarlo de punta a punta antes de tener login.

## 5. Cargar datos de prueba

Todavía no hay un script de importación automática. Las formas más simples
de cargar los primeros choferes/vehículos/pacientes/tutores de prueba:

- A mano, desde la consola de Firebase (Firestore Database > Iniciar
  colección), usando `src/infrastructure/repositories/fixtures/seedData.ts`
  como referencia de la forma de cada documento.
- Con el [emulador de Firestore](https://firebase.google.com/docs/emulator-suite)
  para desarrollo local sin tocar datos reales.

## 6. Cloud Functions (webhook de WhatsApp)

Ver [`functions/README.md`](../functions/README.md) para instalar,
levantar el emulador y desplegar. El diseño completo del bot está en
[`docs/whatsapp-bot.md`](whatsapp-bot.md).

## 7. Autenticación real (login de administrador/coordinador)

Con `env.isFirebaseConfigured` en `true`, el composition root usa
`FirestoreAuthRepository` (`src/infrastructure/firebase/repositories/FirestoreAuthRepository.ts`)
en vez del Mock: login real con Firebase Authentication (email/contraseña) y
el rol (`ADMIN`/`COORDINATOR`) leído desde `/admins/{uid}` en Firestore. Ese
documento **no se puede crear ni editar desde la app** (ver `firestore.rules`
— solo lectura del propio usuario, escritura siempre denegada): asignar un
rol es una acción manual desde la consola, a propósito, para que nadie
pueda autoasignarse acceso.

Mientras no haya un `/admins/{uid}` para un usuario, `AuthProvider` lo deja
en una pantalla de "Cuenta sin acceso asignado" (en vez de mostrarle el
resto de la app) que ya incluye su UID para copiar y pegar.

### Cómo crear el primer usuario (bootstrap)

1. En la consola de Firebase → **Authentication** → **Sign-in method**,
   activá el proveedor **Email/contraseña**.
2. En **Authentication** → **Users** → "Agregar usuario", creá tu propio
   usuario (tu email + una contraseña).
3. Copiá el **User UID** que Firebase le asignó (o iniciá sesión una vez en
   la app: la pantalla de "sin acceso" te lo muestra directamente).
4. En **Firestore Database** → "Iniciar colección" → nombre `admins` →
   ID del documento: ese mismo UID → agregá el campo `role` (string) con el
   valor `ADMIN`.
5. Recargá la app: ya deberías entrar con el panel completo.

Los usuarios siguientes (otros coordinadores) se crean de la misma forma:
usuario en Authentication + documento en `admins/{uid}` con su rol.

### Modo desarrollo sin Firebase

Si `VITE_FIREBASE_PROJECT_ID` no está definido, se sigue usando
`MockAuthRepository`: no hay pantalla de login, la sesión arranca ya
autenticada, y el selector "Ver como" del header permite probar las vistas
de cada rol sin backend. Ese selector desaparece automáticamente en modo
Firebase real (reemplazado por el usuario autenticado y "Cerrar sesión").

## Costo del bundle

Sumar el SDK de Firebase aumentó el tamaño del bundle de producción
(~984 KB sin comprimir, ~455 KB antes). Es un costo aceptado por ahora; una
optimización pendiente es cargar `firebase/app`, `firebase/firestore` y
`firebase/auth` con `import()` dinámico solo cuando
`env.isFirebaseConfigured` es `true`, para que quien siga usando Mocks no
pague ese peso. No se hizo en este cambio para no complicar el
composition root (que hoy es síncrono) bajo presión de tiempo — queda
anotado como deuda técnica conocida.
