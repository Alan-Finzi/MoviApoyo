import * as logger from 'firebase-functions/logger'
import { defineString } from 'firebase-functions/params'

// Nunca en texto plano en el repo (ver README de esta carpeta): configurar
// con `firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN` /
// `WHATSAPP_PHONE_NUMBER_ID` antes de desplegar. Sin esto, cualquier envío
// falla — el resto del bot (recepción, transiciones de estado) sigue
// funcionando igual, solo no llega la respuesta al usuario.
const ACCESS_TOKEN = defineString('WHATSAPP_ACCESS_TOKEN')
const PHONE_NUMBER_ID = defineString('WHATSAPP_PHONE_NUMBER_ID')
const GRAPH_API_VERSION = 'v21.0'

export interface WhatsAppButton {
  readonly id: string
  // Meta trunca/rechaza títulos de más de 20 caracteres.
  readonly title: string
}

async function callGraphApi(body: Record<string, unknown>): Promise<void> {
  const phoneNumberId = PHONE_NUMBER_ID.value()
  const accessToken = ACCESS_TOKEN.value()
  if (!phoneNumberId || !accessToken) {
    logger.warn(
      'WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID no configurados — no se envía nada (ver functions/README.md).',
    )
    return
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ messaging_product: 'whatsapp', ...body }),
    },
  )

  if (!response.ok) {
    const errorBody = await response.text()
    throw new Error(`Graph API respondió ${response.status.toString()}: ${errorBody}`)
  }
}

// Mensaje de texto simple (avisos, confirmaciones de una acción, etc.).
export async function sendWhatsAppText(to: string, body: string): Promise<void> {
  await callGraphApi({
    to,
    type: 'text',
    text: { body },
  })
}

// Botones de respuesta rápida (máximo 3 — límite de la API de Meta). Se usan
// para las acciones del chofer y la confirmación del familiar en vez de
// interpretar texto libre (rule del diseño original: evitar ambigüedad).
export async function sendWhatsAppButtons(
  to: string,
  body: string,
  buttons: readonly WhatsAppButton[],
): Promise<void> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error(`sendWhatsAppButtons acepta entre 1 y 3 botones, recibió ${buttons.length.toString()}.`)
  }
  await callGraphApi({
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: body },
      action: {
        buttons: buttons.map((button) => ({
          type: 'reply',
          reply: { id: button.id, title: button.title },
        })),
      },
    },
  })
}
