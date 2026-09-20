# MoviApoyo

Plataforma web para una empresa de traslado de niños con discapacidad. Conecta a
padres/tutores, choferes, coordinadores y administradores, dando visibilidad en
tiempo real del estado de cada traslado y preparando el envío de notificaciones
(inicialmente por WhatsApp).

Este repositorio es la **base de un producto real**, no una demo visual: está
armado con Clean Architecture y pensado para escalar hacia un backend, GPS y
WhatsApp reales sin reescribir la aplicación.

## Índice

- [Qué es MoviApoyo](#qué-es-moviapoyo)
- [Arquitectura](#arquitectura)
- [Tecnologías](#tecnologías)
- [Instalación](#instalación)
- [Variables de entorno](#variables-de-entorno)
- [Ejecución](#ejecución)
- [Build](#build)
- [Testing](#testing)
- [Estructura de carpetas](#estructura-de-carpetas)
- [Convenciones de código](#convenciones-de-código)
- [Cómo agregar una nueva funcionalidad](#cómo-agregar-una-nueva-funcionalidad)
- [Cómo cambiar el proveedor de mapas](#cómo-cambiar-el-proveedor-de-mapas)
- [Cómo cambiar el proveedor de notificaciones](#cómo-cambiar-el-proveedor-de-notificaciones)
- [Cómo conectar el backend](#cómo-conectar-el-backend)
- [Alcance actual y próximos pasos](#alcance-actual-y-próximos-pasos)

## Qué es MoviApoyo

El sistema modela el ciclo de vida de un traslado: un chofer sale a buscar a un
niño, se acerca a su domicilio (lo que dispara un aviso al padre/tutor), lo
recoge, viaja hacia el destino y lo entrega. En el camino puede haber demoras o
incidentes, que también generan avisos. Todo queda registrado en un historial
auditable.

Como todavía no existe un backend, la aplicación funciona **completamente con
datos simulados**: un motor de simulación mueve los vehículos "en vivo" y
dispara las notificaciones correspondientes, para poder ver el flujo completo
sin depender de nada externo.

## Arquitectura

Clean Architecture en 4 capas, con las dependencias apuntando siempre hacia
adentro. El detalle completo está en [`docs/architecture.md`](docs/architecture.md).

```
Presentation → Application → Domain ← Infrastructure
```

- **Domain**: entidades, enums, value objects, interfaces de repositorios y
  servicios, y reglas de negocio puras (ej. la máquina de estados del
  traslado). No conoce React, ni HTTP, ni ninguna librería externa.
- **Application**: casos de uso. Orquestan el Domain, nunca contienen HTML ni
  llamadas a fetch.
- **Infrastructure**: implementaciones concretas (hoy, todas Mock) de esas
  interfaces: repositorios en memoria, `MockNotificationService`,
  `MockMapProvider`, `TripSimulationEngine`, etc.
- **Presentation**: componentes, páginas, layouts y hooks de React. Consumen
  Use Cases a través de hooks, nunca repositorios directamente.

## Tecnologías

React 19 + TypeScript + Vite, React Router, CSS Modules con variables CSS
(sistema de diseño propio), React Hook Form + Zod para formularios, ESLint +
Prettier, Vitest + Testing Library.

Se evitó deliberadamente sumar dependencias que no aportaban valor real acá:
sin Axios (alcanza `fetch` + un `ApiClient` propio), sin Redux/Zustand (los
datos se manejan con hooks por caso de uso + Context solo para sesión/tema),
sin date-fns/dayjs (alcanza `Intl.DateTimeFormat`), sin Tailwind ni un UI kit
(la identidad visual es propia). El detalle de cada decisión está en el
historial de la conversación de diseño y en los comentarios del código.

## Instalación

Requiere Node.js 20+.

```bash
npm install
```

## Variables de entorno

Copiá `.env.example` a `.env` para desarrollo local si necesitás sobreescribir
algún valor. Los archivos `.env.development`, `.env.test` y `.env.production`
ya están versionados con valores por defecto (sin secretos, como corresponde
en una app Vite: las variables `VITE_*` viajan al bundle del cliente).

| Variable                    | Descripción                                               |
| --------------------------- | --------------------------------------------------------- |
| `VITE_APP_NAME`             | Nombre mostrado en la aplicación.                         |
| `VITE_API_BASE_URL`         | URL base del backend real (vacío mientras se usan Mocks). |
| `VITE_MAP_PROVIDER`         | `mock` \| `leaflet` \| `google` \| `mapbox`               |
| `VITE_MAP_API_KEY`          | API key del proveedor de mapas (cuando no es `mock`).     |
| `VITE_WHATSAPP_PROVIDER`    | `mock` \| `whatsapp-business` \| `external`               |
| `VITE_NOTIFICATION_ENABLED` | Habilita/deshabilita el envío de notificaciones.          |

## Ejecución

```bash
npm run dev
```

La aplicación arranca en `http://localhost:5173`. El motor de simulación
empieza a mover el traslado "en curso" de los datos semilla apenas se carga:
mirá el Dashboard o el detalle del traslado (`/traslados/trip-1`) para verlo
avanzar y generar notificaciones en vivo (aparecen como toasts y en
`/notificaciones`).

Usá el selector **"Ver como"** del header para simular los distintos roles
(Administrador, Coordinador, Chofer, Padre/Tutor) — no hay login real todavía
(ver [Cómo conectar el backend](#cómo-conectar-el-backend)).

## Build

```bash
npm run build
```

Corre el chequeo de tipos (`tsc -b`) y genera el bundle de producción en
`dist/` con Vite.

## Testing

```bash
npm run test        # corre toda la suite una vez
npm run test:watch  # modo watch
```

Hay tests de dominio (máquina de estados del traslado), de utilidades
(formateo de fechas, cálculo de distancia con la fórmula de Haversine), de
casos de uso (la regla de "no notificar dos veces" de proximidad, validación
de configuración) y de componentes (`StatusBadge`).

Otros comandos útiles: `npm run lint`, `npm run lint:fix`, `npm run format`,
`npm run format:check`.

## Estructura de carpetas

```
src/
├── app/            # router, providers (composition root), config de entorno
├── domain/         # entidades, enums, value objects, interfaces, reglas de negocio
├── application/    # casos de uso y DTOs
├── infrastructure/ # implementaciones Mock, motor de simulación, ApiClient
├── presentation/   # componentes, layouts, páginas, hooks, estilos
└── shared/         # constantes, utils, tipos, errores — sin dependencias de framework
```

## Convenciones de código

- Identificadores (clases, funciones, variables) en **inglés**; comentarios y
  textos visibles en **español**.
- Sin `any` salvo casos justificados; TypeScript en modo `strict`.
- Nada de `console.log` suelto: todo el logging pasa por
  `shared/utils/Logger.ts` (regla de ESLint `no-console` activa en el resto
  del proyecto).
- Constantes y textos centralizados en `shared/constants/` — nunca strings
  repetidos en varios archivos.
- CSS Modules + variables definidas en `presentation/styles/tokens.css`.
  Ningún componente hardcodea un color o un espaciado.

## Cómo agregar una nueva funcionalidad

1. Modelá las entidades/enums que necesites en `domain/` (si no existen ya).
2. Definí la interfaz del repositorio o servicio en `domain/repositories` o
   `domain/services`, si hace falta una nueva fuente de datos.
3. Implementá el Mock correspondiente en `infrastructure/` y agregalo al
   listado de datos semilla si aplica (`infrastructure/repositories/fixtures/seedData.ts`).
4. Escribí el Use Case en `application/useCases/`.
5. Conectalo en el composition root: `app/providers/dependencies.ts`.
6. Creá un hook en `presentation/hooks/` que use ese Use Case con `useAsync`.
7. Construí la pantalla en `presentation/pages/`, reutilizando los
   componentes de `presentation/components/` (Card, Table, Badge, etc.).
8. Sumá la ruta en `shared/constants/routes.constants.ts` y en
   `app/router/AppRouter.tsx`.
9. Agregá al menos un test del Use Case o de la regla de negocio nueva.
10. Corré `npm run lint`, `npm run test` y `npm run build` antes de darla por
    terminada.

## Cómo cambiar el proveedor de mapas

Hoy `MockMapProvider` (`infrastructure/maps/MockMapProvider.ts`) implementa
la interfaz `MapService` (`domain/services/MapService.ts`) dibujando un
esquema simple en `<MapContainer>`. Para conectar un proveedor real:

1. Creá `LeafletMapProvider` (o el que corresponda) implementando `MapService`.
2. Reemplazá la instancia en `app/providers/dependencies.ts` (la línea
   `const mapService = new MockMapProvider(...)`), eligiendo según
   `env.mapProvider`.
3. No hace falta tocar `MapContainer`, ni ninguna página: todas consumen la
   interfaz, no la implementación. Ver el detalle en [`docs/maps.md`](docs/maps.md).

## Cómo cambiar el proveedor de notificaciones

Mismo patrón: `MockNotificationService` implementa `NotificationService`
(`domain/services/NotificationService.ts`). Para conectar WhatsApp Business
API (u otro proveedor):

1. Creá `WhatsAppNotificationService` implementando `NotificationService`.
2. Reemplazá la instancia en `app/providers/dependencies.ts`.
3. Ningún Use Case, hook ni componente cambia. Ver
   [`docs/notifications.md`](docs/notifications.md).

## Cómo conectar el backend

1. Definí `VITE_API_BASE_URL` en el `.env` correspondiente.
2. Por cada `Mock*Repository`, creá su par `*RepositoryApi` implementando la
   misma interfaz de `domain/repositories/`, usando `ApiClient`
   (`infrastructure/api/ApiClient.ts`) para las llamadas HTTP.
3. Reemplazá las instancias en `app/providers/dependencies.ts`.
4. Para autenticación real, reemplazá `MockAuthRepository` por una
   implementación que valide contra el backend; `ProtectedRoute` y
   `RoleGuard` (`app/router/`) ya están preparados para leer esa sesión sin
   cambios. Ver [`docs/api.md`](docs/api.md).

## Alcance actual y próximos pasos

Implementado en este MVP: Dashboard, Traslados (listado y detalle), estados
del traslado con máquina de transiciones, mapa esquemático en vivo, choferes,
vehículos, pasajeros (con separación de datos sensibles), notificaciones
(mock + centro de notificaciones), incidentes, configuración de aviso, y toda
la arquitectura preparada para API/GPS/WhatsApp reales.

Deliberadamente fuera de este MVP (documentado, no implementado a medias):
login real, panel de choferes y panel de familia (rutas reservadas, dominio
preparado — ver `docs/architecture.md`), integración real de mapas/WhatsApp/GPS.
