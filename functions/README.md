# Cloud Functions de MoviApoyo

Proyecto Node aparte del frontend (tiene su propio `package.json` y
`tsconfig.json`, y no lo lintea ni compila `npm run build` de la raíz).
Hoy contiene una única función: el webhook de WhatsApp Business API descrito
en [`docs/whatsapp-bot.md`](../docs/whatsapp-bot.md).

## Instalación

```bash
cd functions
npm install
```

## Desarrollo local (con el emulador de Firebase)

```bash
npm run serve
```

## Configurar el token de verificación del webhook

Antes de desplegar, hay que definir el parámetro `WHATSAPP_VERIFY_TOKEN`
(cualquier string que vos elijas — es el mismo valor que después se carga en
Meta for Developers al configurar el webhook):

```bash
firebase functions:secrets:set WHATSAPP_VERIFY_TOKEN
```

## Deploy

```bash
npm run deploy
```

## Qué falta acá (ver docs/whatsapp-bot.md para el diseño completo)

- Validar la firma `X-Hub-Signature-256` del request (confirmar que el POST
  viene realmente de Meta).
- `sendWhatsAppMessage`: enviar respuestas reales por WhatsApp (llamar a la
  Graph API de Meta con un access token — todavía no implementado).
- Botones de confirmación (recogida/entrega), el flujo de varios pasos para
  reportar un incidente, y las consultas de los padres.
- Reescribir `WHATSAPP_VERIFY_TOKEN`, credenciales de la Graph API, etc.
  como Firebase Functions secrets (nunca como variables de entorno en texto
  plano en este repo).
