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

> Este documento describe el diseño. Ya existe un backend/webhook
> implementado en `workers/whatsapp-bot/` (identificación de chofer/familiar,
> idempotencia, botones de estado del chofer, confirmación/cancelación del
> familiar, envío real por la Graph API de Meta) — ver
> [`workers/whatsapp-bot/README.md`](../workers/whatsapp-bot/README.md) para
> el detalle exacto de qué está hecho y qué falta. Corre en Cloudflare
> Workers en vez de Firebase Cloud Functions (que exigía el plan de pago
> Blaze incluso para uso gratuito) — sigue hablando con el mismo Firestore
> del proyecto de Firebase, solo cambió dónde corre el código del servidor.
> Lo que sigue pendiente, todavía sin una cuenta real de Meta conectada:
> validar la firma del webhook, avanzar estados por proximidad real de GPS,
> el flujo completo de incidentes con lista de tipos, y las consultas de los
> padres (ver [Qué falta para implementarlo](#qué-falta-para-implementarlo)).

## Por qué esto no puede vivir en este repositorio

Este proyecto es una SPA de React servida como archivos estáticos: no tiene
ningún proceso corriendo del lado del servidor. WhatsApp Business API entrega
los mensajes entrantes mediante un **webhook** — una URL HTTPS pública que
alguien debe tener escuchando 24/7. Un navegador no puede cumplir ese rol.

Por eso, el bot vive en un **servicio de backend aparte**: un Worker de
Cloudflare (`workers/whatsapp-bot/`), elegido puntualmente porque su plan
gratis no exige tarjeta de crédito en ningún lado (a diferencia de Firebase
Cloud Functions, que exige el plan Blaze incluso para uso $0) — ver
`docs/api.md` para la decisión general de backend del resto de la app.

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

| Acción del chofer                | Mecanismo de WhatsApp                                        | Use Case que dispara                          |
| --------------------------------- | ------------------------------------------------------------- | ---------------------------------------------- |
| Iniciar el traslado                | Botón de respuesta rápida ("Iniciar viaje")                   | `StartTripUseCase`                             |
| Compartir ubicación                | Función nativa "Compartir ubicación" de WhatsApp               | _(nuevo, ver abajo)_ actualiza `Trip.currentLocation` |
| Confirmar que llegó al domicilio   | Pregunta "¿Llegaste?" con botones Sí/No                        | `UpdateTripStatusUseCase` → `LLEGANDO` (si contesta que no, se lo vuelve a preguntar más tarde) |
| Confirmar que recogió al paciente  | Segunda pregunta "¿Retiraste a X?" con botones Sí/No, apenas confirma que llegó | `UpdateTripStatusUseCase` → `NIÑO_RECOGIDO` (Sí) o `PACIENTE_AUSENTE` (No) |
| Confirmar entrega en destino       | Botón ("Entregado")                                            | `UpdateTripStatusUseCase` → `FINALIZADO`       |
| Reportar un incidente              | Lista de opciones (tipos de `IncidentType`) + texto            | `RegisterIncidentUseCase`                      |

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

Ya resuelto: el backend es un Worker de Cloudflare
(`workers/whatsapp-bot/`), con el webhook handler, el resolver de
identidad, la idempotencia por mensaje, los botones del chofer, la
confirmación/cancelación del familiar y los avisos salientes (por cron, ver
`sendPendingNotifications.ts`) implementados — ver
[`workers/whatsapp-bot/README.md`](../workers/whatsapp-bot/README.md) para
el detalle completo de qué hay y qué falta ahí puntualmente. Pendiente a
nivel de proyecto:

1. Conseguir acceso real a WhatsApp Business API: cuenta de Meta for
   Developers + número verificado. Nada de lo implementado se probó todavía
   contra una cuenta real — hoy solo se verificó que compila y que la lógica
   de negocio (transiciones de estado, idempotencia) tiene tests del lado
   del código compartido con la web.
2. Migrar los repositorios de `Mock*` a `*Api` del lado de la web (o a
   acceso directo a una base de datos) — ver `docs/api.md`. El webhook de
   `workers/whatsapp-bot/` ya usa Firestore directo, independiente de esta
   migración.
3. Avanzar el estado del traslado por proximidad real de GPS en vez de
   confirmarlo con las preguntas Sí/No del chofer, y el manejo de
   conversación de varios pasos para el flujo completo de incidentes (hoy es
   un botón único, ver `workers/whatsapp-bot/README.md`).
4. Dar de baja (o dejar sin uso) las rutas `RoleGuard` pensadas para un
   futuro panel de chofer/familia en la web — con este diseño, esos roles ya
   no necesitan pantallas propias. Es una decisión pendiente de confirmar
   antes de tocar el código de `app/router/`.

## Qué no cambia en la web app actual

El Dashboard, Traslados, Choferes, Vehículos, Pasajeros, Notificaciones,
Incidentes y Configuración siguen siendo la herramienta de trabajo del
administrador/coordinador, sin cambios. El bot es un canal adicional de
entrada de datos (ubicación, incidentes, confirmaciones) y de salida de
avisos — no reemplaza el dashboard, lo alimenta y lo complementa.
