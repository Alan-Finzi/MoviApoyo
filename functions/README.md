# Cloud Functions de MoviApoyo

Proyecto Node aparte del frontend (tiene su propio `package.json` y
`tsconfig.json`, y no lo lintea ni compila `npm run build` de la raíz).
Contiene el webhook de WhatsApp Business API y el trigger que envía los
avisos salientes, descritos en
[`docs/whatsapp-bot.md`](../docs/whatsapp-bot.md).

## Instalación

```bash
cd functions
npm install
```

## Desarrollo local (con el emulador de Firebase)

```bash
npm run serve
```

## Configurar los secrets antes de desplegar

```bash
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN
firebase functions:secrets:set WHATSAPP_PHONE_NUMBER_ID
```

- `WHATSAPP_VERIFY_TOKEN`: cualquier string que vos elijas — es el mismo
  valor que después se carga en Meta for Developers al configurar el
  webhook. Solo sirve para el handshake inicial (`GET`), no autentica los
  mensajes que llegan después.
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`: salen de la cuenta
  de Meta for Developers / WhatsApp Business Account real (no existe una
  todavía en este proyecto — sin esto configurado, `sendWhatsAppMessage`
  loguea una advertencia y no manda nada; el resto del bot sigue
  funcionando igual).

## Deploy

```bash
npm run deploy
```

Después del primer deploy hace falta también publicar los índices nuevos
de Firestore (`firebase deploy --only firestore:indexes`, desde la raíz del
repo) — el webhook consulta traslados por chofer + estado + fecha, que
requiere un índice compuesto (ver `firestore.indexes.json`).

## Qué hay implementado

- Identificación de chofer/familiar por teléfono (`identity.ts`), con
  idempotencia por id de mensaje (`dedupe.ts` — Meta puede reenviar el mismo
  webhook varias veces).
- Chofer: ubicación por WhatsApp (actualiza `Trip.currentLocation`), y
  botones de "Iniciar viaje" / "Recogido" / "Entregado" / "Problema" /
  "Emergencia" (`whatsappWebhook.ts`), que validan la transición contra la
  misma tabla que usa la web (`tripStatusMachine.ts`, espejo de
  `src/domain/services/TripStatusMachine.ts`).
- Familiar: confirmar o cancelar un traslado por botones; cancelar pide el
  motivo en un mensaje de texto aparte (`conversationState.ts`, un paso de
  conversación, ver diseño en `docs/whatsapp-bot.md`).
- Envío real de WhatsApp (`whatsappClient.ts`, Graph API de Meta) — corre
  server-side a propósito (nunca en el navegador, para no exponer el access
  token). El trigger `sendGuardianNotification` escucha la colección
  `notifications` (la misma que ya escribía `SendNotificationUseCase` desde
  la web) y manda el mensaje real cuando aparece un documento nuevo — la web
  no sabe ni necesita saber que este trigger existe.

## Qué falta (ver docs/whatsapp-bot.md para el diseño completo)

- **Cuenta real de Meta for Developers + WhatsApp Business** — nada de esto
  se probó de punta a punta todavía, no hay número conectado.
- Validar la firma `X-Hub-Signature-256` del request (confirmar que el POST
  viene realmente de Meta) — importante antes de producción.
- Avance de estado por proximidad real de GPS (cerca del domicilio/destino):
  hoy los pasos intermedios se saltean de una sola vez al tocar "Iniciar" /
  "Recogido" / "Entregado" (mismo criterio que `StartTripUseCase` del lado
  de la web), en vez de detectarse solos por distancia como hace
  `TripSimulationEngine`. El propio diseño original ya señala que esto
  necesita primero extraer esa lógica de umbrales a un servicio compartido.
- El flujo completo de "reportar incidente" con lista de tipos + descripción
  propia — hoy es un botón único "Problema" (tipo `OTRO`, descripción
  genérica) para no sumar una conversación de varios pasos más.
- Las consultas de los padres ("¿dónde está mi hijo?", "ver historial").
- Reescribir `WHATSAPP_VERIFY_TOKEN`/`WHATSAPP_ACCESS_TOKEN`/
  `WHATSAPP_PHONE_NUMBER_ID` como Firebase Functions secrets está ya
  reflejado arriba, pero falta cargarlos con una cuenta real.
