import { processWhatsAppWebhook, type WhatsAppWebhookPayload } from './whatsappWebhook'
import { sendPendingNotifications } from './sendPendingNotifications'
import type { Env } from './types'

// Se configura acá (wrangler secret put WHATSAPP_VERIFY_TOKEN) y en Meta for
// Developers con el mismo valor (ver README.md de esta carpeta). Sirve solo
// para el handshake inicial de verificación del webhook — no autentica los
// mensajes que llegan después (esos vienen firmados por Meta; validar esa
// firma es un paso pendiente antes de ir a producción, ver el comentario en
// whatsappWebhook.ts).
function handleVerifyHandshake(url: URL, env: Env): Response {
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === env.WHATSAPP_VERIFY_TOKEN && challenge) {
    return new Response(challenge, { status: 200 })
  }
  return new Response('Forbidden', { status: 403 })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    if (request.method === 'GET') {
      return handleVerifyHandshake(url, env)
    }

    if (request.method === 'POST') {
      // IMPORTANTE antes de producción: validar la firma
      // "X-Hub-Signature-256" del request contra el App Secret de Meta, para
      // confirmar que el POST realmente viene de WhatsApp y no de cualquiera
      // que le pegue a esta URL pública.
      try {
        const payload = (await request.json()) as WhatsAppWebhookPayload
        await processWhatsAppWebhook(env, payload)
      } catch (error) {
        console.error('Error procesando el webhook de WhatsApp', error)
      }
      // Se responde 200 siempre: si se responde error, Meta reintenta el
      // mismo mensaje muchas veces seguidas.
      return new Response('OK', { status: 200 })
    }

    return new Response('Method Not Allowed', { status: 405 })
  },

  // Reemplaza al trigger de Firestore `sendGuardianNotification` de la
  // versión con Firebase Functions — ver sendPendingNotifications.ts y
  // wrangler.toml (corre cada 1 minuto).
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(sendPendingNotifications(env))
  },
} satisfies ExportedHandler<Env>
