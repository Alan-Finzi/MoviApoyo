# Bot de WhatsApp de MoviApoyo (Cloudflare Workers)

Reemplaza a la versión anterior de este backend, que vivía en `functions/`
como Firebase Cloud Functions. Se migró acá porque Cloud Functions (2ª gen)
exige el plan de facturación Blaze — tarjeta cargada — para cualquier
función que llame a una API externa (como la de Meta), sin importar el
volumen. Cloudflare Workers tiene un plan gratis que **no pide tarjeta** y
alcanza de sobra para esta app.

## Qué cambia respecto a la versión con Firebase Functions

- **No usa el Admin SDK de Firebase** (no corre en el runtime de Workers,
  que no es Node.js completo) — habla con Firestore directo por su
  [API REST](https://firebase.google.com/docs/firestore/reference/rest),
  autenticándose como Service Account vía OAuth2 (`firestoreRest.ts`).
- **Los avisos salientes ya no son un trigger de Firestore** (Workers no
  puede quedarse "escuchando" una colección) — un
  [Cron Trigger](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
  corre cada 1 minuto (`sendPendingNotifications.ts`) y busca notificaciones
  con `whatsappSentAt: null` (la marca la pone
  `FirestoreNotificationRepository.saveNotification()` del lado de la web, y
  también `whatsappWebhook.ts` cuando el propio chofer dispara un aviso). La
  web y el webhook no saben ni necesitan saber que este cron existe — igual
  que antes no sabían que existía el trigger de Firestore.
- El webhook de WhatsApp (recepción de mensajes de chofer/familiar) sigue
  siendo el mismo diseño y la misma lógica de negocio, solo que como un
  `fetch()` handler de Workers en vez de una `onRequest` de Firebase
  Functions.
- Firestore en sí **sigue siendo el mismo**, en el mismo proyecto Firebase —
  esto no migra la base de datos, solo el código que corre del lado del
  servidor. El proyecto de Firebase puede quedarse en el plan gratis
  (Spark): Firestore no exige Blaze, solo lo exigía Cloud Functions.

## Instalación

```bash
cd workers/whatsapp-bot
npm install
```

## Cuenta de Cloudflare (gratis, sin tarjeta)

1. Creá una cuenta en https://dash.cloudflare.com/sign-up (plan Free).
2. `npx wrangler login` — abre el navegador para autorizar la CLI contra tu
   cuenta.

## Service Account de Google (para que el Worker pueda leer/escribir Firestore)

El Worker no puede usar el Admin SDK, así que se autentica como una cuenta
de servicio de Google Cloud, con acceso solo a Firestore — esto es gratis y
no requiere el plan Blaze (Firestore está disponible en el plan Spark).

1. Consola de Google Cloud → IAM y administración → Cuentas de servicio →
   `https://console.cloud.google.com/iam-admin/serviceaccounts?project=moviapoyo`
2. "Crear cuenta de servicio" → nombre a elección (ej.
   `whatsapp-bot-worker`) → rol **Cloud Datastore User**
   (`roles/datastore.user`, alcanza y sobra: solo necesita leer/escribir
   Firestore, nada más).
3. Entrá a la cuenta creada → pestaña "Claves" → "Agregar clave" → JSON →
   se descarga un archivo. Ese JSON tiene los dos valores que hacen falta
   abajo: `client_email` y `private_key`.

## Configurar los secrets antes de desplegar

```bash
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_EMAIL
npx wrangler secret put GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
npx wrangler secret put WHATSAPP_VERIFY_TOKEN
npx wrangler secret put WHATSAPP_ACCESS_TOKEN
npx wrangler secret put WHATSAPP_PHONE_NUMBER_ID
```

- `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`:
  salen del JSON del paso anterior (`client_email` y `private_key` tal
  cual, con los `\n` y todo — pegalo completo, incluyendo las líneas
  `-----BEGIN PRIVATE KEY-----`/`-----END PRIVATE KEY-----`).
- `WHATSAPP_VERIFY_TOKEN`: cualquier string que elijas — es el mismo valor
  que después cargás en Meta for Developers al configurar el webhook.
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`: salen de la cuenta
  de Meta for Developers / WhatsApp Business (panel "API Setup").

Para desarrollo local (`npm run dev`), estos mismos nombres van en un
archivo `.dev.vars` (ya está en `.gitignore`, nunca se commitea) en vez de
`wrangler secret put`.

## Deploy

```bash
npm run deploy
```

Wrangler va a imprimir la URL pública del Worker (algo como
`https://moviapoyo-whatsapp-bot.<tu-subdominio>.workers.dev`) — esa es la
URL que se carga en Meta como "Callback URL" del webhook.

Después del primer deploy hace falta también publicar el índice compuesto
de Firestore que usa el webhook (traslados por chofer + estado + fecha, ver
`firestore.indexes.json` en la raíz del repo):

```bash
firebase deploy --only firestore:indexes
```

(esto tampoco exige Blaze — los índices son una configuración de Firestore,
no de Cloud Functions).

## Ver logs en vivo

```bash
npm run tail
```

## Qué hay implementado

Igual que documentaba `functions/README.md` antes de la migración:
identificación de chofer/familiar por teléfono, idempotencia por id de
mensaje, ubicación del chofer, confirmar llegada/recogida en dos preguntas
Sí-No, botones de "Iniciar viaje"/"Entregado"/"Problema"/"Emergencia",
confirmar/cancelar un traslado desde el familiar, y avisos automáticos por
WhatsApp en los mismos hitos que ya notifica la web — ver
[`docs/whatsapp-bot.md`](../../docs/whatsapp-bot.md) para el diseño
completo.

## Qué falta

- **Cuenta real de Meta for Developers + WhatsApp Business** conectada —
  nada de esto se probó todavía de punta a punta contra un número real.
- Validar la firma `X-Hub-Signature-256` del request (confirmar que el POST
  viene realmente de Meta) — importante antes de producción.
- Avance de estado por proximidad real de GPS, la lista completa de tipos
  de incidente, y las consultas de los padres ("¿dónde está mi hijo?") —
  mismos pendientes que ya señalaba el diseño original.
