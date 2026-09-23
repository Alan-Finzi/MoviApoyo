# Notificaciones

> Este documento cubre las notificaciones **salientes** (la empresa avisa al
> padre/tutor). Para el diseño de los mensajes **entrantes** (el chofer
> escribiéndole al bot para compartir ubicación, confirmar recogida o
> reportar un incidente), ver [`docs/whatsapp-bot.md`](whatsapp-bot.md).

## Abstracción

`domain/services/NotificationService.ts` define el contrato:

```ts
interface NotificationService {
  sendNotification(input: SendNotificationInput): Promise<void>
}
```

Ni la UI ni los Use Cases conocen WhatsApp, ni ningún proveedor concreto.
Hoy, `infrastructure/notifications/MockNotificationService.ts` implementa
esta interfaz dejando constancia en el log y simulando latencia de red — no
llama a ningún servicio externo (tal como pide el enunciado).

## Quién dispara una notificación

Un único caso de uso concentra el envío: `SendNotificationUseCase`. Recibe el
`NotificationService` (para intentar el envío) y `NotificationRepository`
(para dejar registro, siempre, sin importar si el envío tuvo éxito) —así
toda notificación termina apareciendo en el centro de notificaciones
(`/notificaciones`) con su estado real (`ENVIADA`, `FALLIDA`, etc.).

Dos flujos disparan `SendNotificationUseCase`:

1. **Cambios de estado del traslado** (`UpdateTripStatusUseCase`): al pasar
   a `LLEGANDO`, `NIÑO_RECOGIDO`, `EN_TRASLADO`, `FINALIZADO` o `DEMORADO`,
   se arma el mensaje correspondiente (`domain/services/TripNotificationRules.ts`)
   y se envía.
2. **Proximidad al domicilio** (`CheckTripProximityUseCase`): compara la
   distancia (o el ETA) actual del vehículo contra `NotificationSettings` y,
   si corresponde, notifica una única vez por traslado — la clave de
   deduplicación (`NEAR_PICKUP`) se guarda en `Trip.notifiedMilestones`.

## Evitar duplicados

`Trip.notifiedMilestones` es un arreglo de claves de hito ya notificado. Antes
de enviar el aviso de proximidad, `CheckTripProximityUseCase` chequea que la
clave `NEAR_PICKUP` no esté ya presente. Los avisos ligados a cambios de
estado no necesitan esta lista porque un traslado no puede volver a pasar dos
veces por el mismo estado dentro del camino feliz (ver `TripStatusMachine.ts`).

## Cómo conectar WhatsApp Business API

1. Crear `infrastructure/notifications/WhatsAppNotificationService.ts`
   implementando `NotificationService`, usando `ApiClient` o el SDK que
   corresponda para llamar a la API real.
2. En `app/providers/dependencies.ts`, reemplazar:
   ```ts
   const notificationService = new MockNotificationService()
   ```
   por la nueva implementación (idealmente eligiendo según
   `env.whatsappProvider`).
3. Nada más cambia: `SendNotificationUseCase`, los Use Cases que lo usan, los
   hooks y las pantallas siguen exactamente igual.

## Centro de notificaciones y toasts

`/notificaciones` lista todo lo que pasó por `NotificationRepository`
(`useNotifications`, que se suscribe a los cambios para actualizarse solo).
Además, `NotificationToastBridge` (`app/providers/`) escucha esas mismas
notificaciones nuevas y las muestra como toasts flotantes en toda la
aplicación — es un puente entre el motor de simulación (que no sabe nada de
React) y el `ToastProvider` (Context API), sin acoplarlos entre sí.
