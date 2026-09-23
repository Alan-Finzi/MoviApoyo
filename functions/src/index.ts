import { initializeApp } from 'firebase-admin/app'
import * as logger from 'firebase-functions/logger'
import { defineString } from 'firebase-functions/params'
import { onRequest } from 'firebase-functions/v2/https'

import { processWhatsAppWebhook, type WhatsAppWebhookPayload } from './whatsappWebhook'

initializeApp()

// Se configura acá y en Meta for Developers con el mismo valor (ver
// docs/firebase.md en la raíz del repo). Sirve solo para el handshake
// inicial de verificación del webhook — no autentica los mensajes que
// llegan después (esos vienen firmados por Meta; validar esa firma es un
// paso pendiente antes de ir a producción, ver el comentario más abajo).
const VERIFY_TOKEN = defineString('WHATSAPP_VERIFY_TOKEN')

export const whatsappWebhook = onRequest(async (request, response) => {
  if (request.method === 'GET') {
    const mode = request.query['hub.mode']
    const token = request.query['hub.verify_token']
    const challenge = request.query['hub.challenge']

    if (mode === 'subscribe' && token === VERIFY_TOKEN.value()) {
      response.status(200).send(challenge)
      return
    }
    response.sendStatus(403)
    return
  }

  if (request.method === 'POST') {
    // IMPORTANTE antes de producción: validar la firma
    // "X-Hub-Signature-256" del request contra el App Secret de Meta, para
    // confirmar que el POST realmente viene de WhatsApp y no de cualquiera
    // que le pegue a esta URL pública.
    try {
      await processWhatsAppWebhook(request.body as WhatsAppWebhookPayload)
    } catch (error) {
      logger.error('Error procesando el webhook de WhatsApp', error)
    }
    // Se responde 200 siempre: si se responde error, Meta reintenta el
    // mismo mensaje muchas veces seguidas.
    response.sendStatus(200)
    return
  }

  response.sendStatus(405)
})
