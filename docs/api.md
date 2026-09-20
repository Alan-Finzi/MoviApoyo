# API y backend

## Estado actual

Todos los repositorios (`domain/repositories/*`) tienen hoy una única
implementación: `Mock*Repository`, que lee y escribe sobre un store en
memoria (`infrastructure/repositories/stores.ts`), sembrado con datos de
ejemplo (`infrastructure/repositories/fixtures/seedData.ts`). No hay ninguna
llamada de red en la aplicación todavía.

## ApiClient

`infrastructure/api/ApiClient.ts` ya existe, preparado para el día que haya
backend, aunque hoy no lo usa ningún repositorio. Centraliza:

- `baseURL` (desde `VITE_API_BASE_URL`, vía `app/config/env.ts`).
- Headers, incluido un `Authorization: Bearer <token>` opcional
  (`getAuthToken`).
- Timeout con `AbortController` (`VITE_API_BASE_URL` + `timeoutMs`).
- Mapeo de errores HTTP a la jerarquía de `AppError`
  (`shared/errors/AppError.ts`): 404 → `NotFoundError`, 400/422 →
  `ValidationError` (con los errores de campo, si el backend los manda),
  cualquier otro fallo de red → `NetworkError`.

Usa `fetch` nativo, no Axios — no hacía falta la dependencia extra para lo
que este cliente necesita.

## Cómo conectar el backend real

1. Definir `VITE_API_BASE_URL` en `.env` (o en `.env.production`).
2. Por cada entidad, crear `infrastructure/repositories/<Entidad>RepositoryApi.ts`
   implementando la misma interfaz que su `Mock*Repository` (ej.
   `TripRepositoryApi implements TripRepository`), usando `ApiClient` para
   las llamadas HTTP y mapeando la respuesta del backend a las entidades de
   `domain/entities/`.
3. En `app/providers/dependencies.ts`, reemplazar cada instancia Mock por su
   versión Api (idealmente eligiendo automáticamente según si
   `env.apiBaseUrl` está definido).
4. `TripRepository.subscribe` y `NotificationRepository.subscribe` hoy
   delegan en el store en memoria; con backend real, esa suscripción pasaría
   a resolverse con WebSockets, Server-Sent Events o polling — pero **el
   contrato no cambia**, así que ningún hook de Presentation necesita
   tocarse.
5. Autenticación real: reemplazar `MockAuthRepository` por una
   implementación que llame al backend y guarde el token (via `ApiClient`).
   `ProtectedRoute` ya está listo para leer esa sesión y redirigir si no hay
   una válida.

## Errores

Todo el código de Application e Infrastructure lanza (o rechaza promesas
con) subclases de `AppError` (`NetworkError`, `NotFoundError`,
`ValidationError`, `UnexpectedError`). Los hooks de Presentation
(`useAsync`) los normalizan a un mensaje de texto vía `toAppError()`, y los
componentes `ErrorState`/`Alert` los muestran. Ninguna pantalla debería
mostrar el `message` de un error nativo de JavaScript sin pasar por esta
jerarquía.
