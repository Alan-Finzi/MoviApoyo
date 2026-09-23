# Arquitectura

## Clean Architecture

El proyecto separa el código en 4 capas concéntricas. La regla es simple: **las
dependencias solo apuntan hacia adentro**.

```
┌─────────────────────────────────────────────┐
│ Presentation (React: componentes, páginas)   │
│  ┌─────────────────────────────────────────┐ │
│  │ Application (Use Cases, DTOs)            │ │
│  │  ┌─────────────────────────────────────┐ │ │
│  │  │ Domain (entidades, reglas de        │ │ │
│  │  │ negocio, interfaces)                 │ │ │
│  │  └─────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
        ↑ Infrastructure implementa las
          interfaces que Domain define
```

- **Domain** no importa nada de las otras capas. Ni React, ni fetch, ni
  Axios. Solo TypeScript puro. Contiene:
  - `entities/`: `Trip`, `Driver`, `Vehicle`, `Passenger`, `Guardian`,
    `Incident`, `Notification`, `NotificationSettings`, `TripEvent`, `User`.
  - `enums/`: `TripStatus`, `VehicleStatus`, `DriverStatus`, `IncidentType`,
    `NotificationType`, `NotificationStatus`, `NotificationChannel`,
    `UserRole`, `ProximityCriterion`. Modelados como objetos `as const` (no
    `enum` de TypeScript) — decisión de estilo, no una restricción del
    compilador.
  - `valueObjects/`: `Address`, `PhoneNumber`, `LicensePlate`, `Distance`.
    `PhoneNumber` y `LicensePlate` son "branded types": solo se obtienen
    validando el formato de entrada.
  - `repositories/`: interfaces (`TripRepository`, `DriverRepository`, etc.)
    que Infrastructure implementa.
  - `services/`: interfaces (`NotificationService`, `MapService`,
    `DistanceService`, `LocationService`) más la lógica de negocio pura de
    `TripStatusMachine.ts` y `TripNotificationRules.ts`.

- **Application** orquesta el Domain a través de Use Cases
  (`application/useCases/`), uno por acción o consulta (`GetTripsUseCase`,
  `UpdateTripStatusUseCase`, `RegisterIncidentUseCase`, etc.). Los DTOs
  (`application/dto/`) son las formas de datos ya pensadas para una pantalla
  específica (ej. `TripListItemDto` trae el nombre del chofer ya resuelto).

- **Infrastructure** contiene las implementaciones concretas. Hay dos
  familias por repositorio: `Mock*Repository` (en memoria, mediante un
  store observable simple — `infrastructure/store/createStore.ts` — sin
  Redux ni Zustand) y `Firestore*Repository` (`infrastructure/firebase/repositories/`,
  ver [`docs/firebase.md`](firebase.md)) — el composition root elige una u
  otra según haya o no un proyecto de Firebase configurado. También viven
  acá `MockNotificationService`, `MockMapProvider`, `HaversineDistanceService`
  (esta sí es una implementación real, no mock: la fórmula de distancia
  entre coordenadas es la misma independientemente del origen del dato),
  `MockLocationService`, `TripSimulationEngine` (el motor que mueve los
  traslados "en vivo") y `ApiClient` (preparado para un backend HTTP propio,
  alternativo a Firestore).

- **Presentation** son los componentes de React. Las páginas
  (`presentation/pages/`) usan hooks (`presentation/hooks/`) que llaman a
  Use Cases — nunca a un repositorio directamente. El sistema de diseño
  (`presentation/components/`) son piezas reutilizables sin lógica de
  negocio.

## Flujo de datos

```
Componente
   ↓
Hook (useTrips, useTripDetail, ...) — usa useAsync() para loading/success/empty/error
   ↓
Use Case (application/useCases)
   ↓
Repository / Service (interfaz, domain/repositories o domain/services)
   ↓
Implementación concreta (Mock hoy, *Api mañana — infrastructure/)
```

Ningún componente llama a `fetch` directamente. Ningún Use Case importa React.

## Inyección de dependencias

No hay un contenedor de DI de terceros (sería sobre-ingeniería para este
tamaño de proyecto). `app/providers/dependencies.ts` es el **composition
root**: instancia cada repositorio/servicio Mock y arma los Use Cases
inyectándoselos. Es el único archivo que debería cambiar el día que se
reemplace un Mock por una implementación real.

## SOLID en la práctica

- **Single Responsibility**: cada Use Case hace una sola cosa. Los
  componentes de UI (`Button`, `Card`, `Table`) no saben nada de HTTP ni de
  reglas de negocio.
- **Open/Closed**: `NotificationService`, `MapService`, `DistanceService` y
  `LocationService` se extienden agregando una nueva implementación, sin
  modificar a quien los consume.
- **Liskov**: cualquier implementación de `TripRepository` (Mock o futura
  Api) debe poder sustituir a la otra sin romper a `GetTripsUseCase`.
- **Interface Segregation**: cada repositorio expone solo los métodos que su
  dominio necesita (`PassengerRepository.getSensitiveInfo` está separado de
  `getPassengerById` a propósito).
- **Dependency Inversion**: Application y Domain dependen de interfaces
  (`TripRepository`), nunca de `MockTripRepository` directamente. Quien
  decide la implementación concreta es `app/providers/dependencies.ts`.

## Roles y rutas protegidas

`ProtectedRoute` y `RoleGuard` (`app/router/`) ya están en su lugar (rule 30),
aunque hoy `MockAuthRepository` siempre resuelve una sesión (no hay login
real todavía — rule 29). El selector "Ver como" del header cambia el rol
simulado y las rutas con `RoleGuard` reaccionan de inmediato.

## Decisión de producto: choferes y padres van por WhatsApp, no por la web

> **Actualizado**: se decidió que choferes y padres/tutores no van a tener
> una pantalla web propia — toda su interacción es por WhatsApp, sin
> descargar ni ingresar a ninguna app. Solo administradores y coordinadores
> usan el dashboard. El diseño completo de ese flujo está en
> [`docs/whatsapp-bot.md`](whatsapp-bot.md).

Esto reemplaza la idea original de un futuro "panel de chofer" (rule 59) y
"panel de familia" (rule 58, ruta `/familia` reservada en
`shared/constants/routes.constants.ts`): esas pantallas no se van a construir.
Los Use Cases que se pensaron para alimentarlas (`StartTripUseCase`,
`UpdateTripStatusUseCase`, `RegisterIncidentUseCase`, `GetTripByIdUseCase`,
`GetTripMapDataUseCase`) siguen siendo exactamente los que va a llamar el
webhook de WhatsApp el día que se implemente — el trabajo de Application y
Domain no se pierde, solo cambia quién los invoca.

Las rutas `RoleGuard` para `DRIVER`/`PARENT` (`app/router/AppRouter.tsx`) y
la ruta `/familia` quedan como código sin uso real por ahora: no se
eliminaron todavía porque es una decisión de código pendiente de confirmar,
no solo de documentación (ver el punto 5 de "Qué falta para implementarlo"
en `docs/whatsapp-bot.md`).
