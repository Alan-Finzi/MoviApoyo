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

- **Infrastructure** contiene las implementaciones concretas: los
  `Mock*Repository` (en memoria, mediante un store observable simple —
  `infrastructure/store/createStore.ts` — sin Redux ni Zustand),
  `MockNotificationService`, `MockMapProvider`, `HaversineDistanceService`
  (esta sí es una implementación real, no mock: la fórmula de distancia
  entre coordenadas es la misma independientemente del origen del dato),
  `MockLocationService`, `TripSimulationEngine` (el motor que mueve los
  traslados "en vivo") y `ApiClient` (preparado para cuando exista backend).

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

## Experiencias futuras (dominio preparado, UI no implementada)

- **Panel de choferes** (`/choferes` es el listado administrativo actual;
  una futura app/panel para que el chofer inicie viaje, confirme recogida,
  informe demoras — rule 59 — puede construirse reutilizando los mismos Use
  Cases: `StartTripUseCase`, `UpdateTripStatusUseCase`, `RegisterIncidentUseCase`).
- **Panel de familia** (`/familia`, ruta reservada en
  `shared/constants/routes.constants.ts` — rule 58): mostraría el próximo
  traslado del hijo, ETA y notificaciones, reutilizando
  `GetTripByIdUseCase` y `GetTripMapDataUseCase`.

No se implementaron para no meter complejidad innecesaria en el MVP (rule
60), pero el dominio ya los soporta.
