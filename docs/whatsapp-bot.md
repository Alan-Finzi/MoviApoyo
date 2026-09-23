# Bot de WhatsApp para choferes y padres

## Decisión de producto

Solo **administradores y coordinadores** usan la web app (el dashboard que ya
existe). **Choferes y padres/tutores no descargan ni ingresan a ninguna
aplicación**: toda su interacción es por WhatsApp, escribiendo al número de
la empresa.

Esto es un cambio respecto a lo planteado en `docs/architecture.md` sobre un
futuro "panel de chofer" o "panel de familia" web (rule 58/59 del
enunciado original): esos paneles quedan **reemplazados** por este bot, no
se van a construir como pantallas de React.

> Este documento describe el diseño. Todavía no hay backend ni webhook
> implementado — es la base para cuando se decida construirlo (ver
> [Qué falta para implementarlo](#qué-falta-para-implementarlo)).

## Por qué esto no puede vivir en este repositorio

Este proyecto es una SPA de React servida como archivos estáticos: no tiene
ningún proceso corriendo del lado del servidor. WhatsApp Business API entrega
los mensajes entrantes mediante un **webhook** — una URL HTTPS pública que
alguien debe tener escuchando 24/7. Un navegador no puede cumplir ese rol.

Por eso, el bot va a vivir en un **servicio de backend aparte** (Node/Express,
o una función serverless: Cloud Functions, Lambda, etc. — la misma decisión
que hay que tomar el día que se conecte cualquier backend real, ver
`docs/api.md`).

## La buena noticia: la lógica de negocio ya está lista

`src/domain/` y `src/application/` no tienen ninguna dependencia de React,
del navegador ni de Vite: son TypeScript puro. El futuro backend puede
**reutilizar ese mismo código tal cual** (copiado a un paquete compartido, o
directamente si backend y frontend terminan viviendo en un monorepo) en vez
de reescribir la lógica de traslados, incidentes y notificaciones.

El webhook de WhatsApp sería, arquitectónicamamente, una "puerta de entrada"
más — igual que hoy lo es un componente de React — que termina llamando a
los mismos Use Cases:

```
Mensaje de WhatsApp entrante
   ↓
Webhook handler (backend, no existe todavía)
   ↓
Identificar al remitente por número de teléfono → Driver o Guardian
   ↓
Interpretar el mensaje/botón presionado → qué Use Case corresponde
   ↓
Use Case (application/useCases) — el mismo que ya usa la web
   ↓
Domain / Repository (con backend real, ya no en memoria)
   ↓
Respuesta de WhatsApp (confirmación al chofer, o el dato pedido al padre)
```

## Flujos por chofer

| Acción del chofer             | Mecanismo de WhatsApp                               | Use Case que dispara                                  |
| ----------------------------- | --------------------------------------------------- | ----------------------------------------------------- |
| Iniciar el traslado           | Botón de respuesta rápida ("Iniciar viaje")         | `StartTripUseCase`                                    |
| Compartir ubicación           | Función nativa "Compartir ubicación" de WhatsApp    | _(nuevo, ver abajo)_ actualiza `Trip.currentLocation` |
| Confirmar que recogió al niño | Botón ("Recogido")                                  | `UpdateTripStatusUseCase` → `NIÑO_RECOGIDO`           |
| Confirmar entrega en destino  | Botón ("Entregado")                                 | `UpdateTripStatusUseCase` → `FINALIZADO`              |
| Reportar un incidente         | Lista de opciones (tipos de `IncidentType`) + texto | `RegisterIncidentUseCase`                             |

**Por qué botones/listas y no texto libre**: WhatsApp Business API soporta
mensajes interactivos (botones, listas) nativamente. Usarlos en vez de
interpretar texto libre evita tener que sumar un motor de NLU y elimina la
ambigüedad — el chofer no tiene que "escribir bien", solo tocar una opción.
El texto libre queda reservado para lo que realmente lo necesita
(descripción de un incidente, observaciones).

**Ubicación por WhatsApp**: cuando alguien comparte su ubicación en WhatsApp,
el webhook recibe latitud/longitud directamente — no hace falta que el
chofer escriba nada. Hoy esa posición la genera `TripSimulationEngine`
(rule 46: implementación Mock preparada para reemplazo); con el bot, ese
mismo punto de entrada (`TripRepository.updateTrip` con
`currentLocation`) pasaría a alimentarse de la ubicación real que manda el
chofer, en vez de la simulación. Conviene entonces un caso de uso explícito
`UpdateVehicleLocationUseCase(tripId, coordinates)` que:

1. Actualice `Trip.currentLocation` (igual que hace `TripSimulationEngine`
   hoy).
2. Llame a `CheckTripProximityUseCase` con la nueva distancia calculada.
3. Aplique la misma lógica de `resolveApproachStatus`/`resolveTransitStatus`
   que hoy vive dentro de `TripSimulationEngine`, para avanzar el estado del
   traslado cuando corresponda — probablemente conviene extraer esa lógica de
   umbrales a un servicio de dominio compartido
   (`domain/services/TripProximityRules.ts`) para que la use tanto el motor
   de simulación (mientras no haya choferes reales) como este Use Case
   (cuando la ubicación es real).

## Flujos por padre/tutor

| Acción del padre                  | Mecanismo                                    | Origen del dato                                                       |
| --------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| Recibe avisos automáticos         | Mensaje saliente (ya diseñado)               | `SendNotificationUseCase` (ver `docs/notifications.md`)               |
| Pregunta "¿dónde está mi hijo?"   | Texto libre con palabras clave, o botón fijo | `GetTripByIdUseCase` + `GetTripMapDataUseCase`, formateado como texto |
| Pregunta por el historial del día | Botón fijo ("Ver historial")                 | El `events` del `Trip`, formateado como lista                         |

A diferencia del chofer, acá alcanza con reconocer un puñado de palabras
clave o un menú fijo de botones (no hace falta interpretar lenguaje natural
complejo): son consultas de solo lectura, sin riesgo si el bot no entiende
algo (puede responder con un menú de opciones en vez de fallar).

## Identificación del remitente

Todo mensaje entrante trae el número de teléfono de origen. El webhook debe
resolverlo contra `DriverRepository`/`GuardianRepository` (por el campo
`phone`, ya modelado como `PhoneNumber`) antes de hacer nada. Si el número no
corresponde a ningún chofer o tutor conocido, el bot debería responder con un
mensaje genérico (o no responder), nunca ejecutar un Use Case a ciegas.

Esto requiere un nuevo servicio de dominio, `IdentityResolver` (o extender
`AuthRepository`), que no existe todavía — se agrega junto con el backend.

## Conversaciones con más de un paso

Reportar un incidente necesita varios datos (tipo, descripción, demora
estimada) en más de un mensaje. Esto requiere guardar un estado de
conversación por número de teléfono mientras dura el intercambio (ej.
"esperando la descripción del incidente X"). Es un concepto nuevo,
`WhatsAppConversationState`, que viviría en el backend (no en este
frontend) — probablemente una tabla/colección simple con un TTL corto.

## Qué falta para implementarlo

1. Elegir el backend (Node/Express vs. serverless) y dónde se hostea — la
   misma decisión pendiente en `docs/api.md`.
2. Conseguir acceso a WhatsApp Business API: cuenta de Meta for Developers +
   número verificado, o un proveedor intermediario (Twilio, 360dialog,
   Gupshup) si se prefiere no lidiar directo con la API de Meta.
3. Migrar los repositorios de `Mock*` a `*Api` (o a acceso directo a una base
   de datos, si el backend y el "backend del bot" son el mismo servicio) —
   ver `docs/api.md`.
4. Implementar el webhook handler, el `IdentityResolver`, el
   `UpdateVehicleLocationUseCase` y el manejo de conversación de varios
   pasos descritos arriba.
5. Dar de baja (o dejar sin uso) las rutas `RoleGuard` pensadas para un
   futuro panel de chofer/familia en la web — con este diseño, esos roles ya
   no necesitan pantallas propias. Es una decisión pendiente de confirmar
   antes de tocar el código de `app/router/`.

## Qué no cambia en la web app actual

El Dashboard, Traslados, Choferes, Vehículos, Pasajeros, Notificaciones,
Incidentes y Configuración siguen siendo la herramienta de trabajo del
administrador/coordinador, sin cambios. El bot es un canal adicional de
entrada de datos (ubicación, incidentes, confirmaciones) y de salida de
avisos — no reemplaza el dashboard, lo alimenta y lo complementa.
