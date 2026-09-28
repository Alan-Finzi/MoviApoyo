import type { Env } from './types'

const GRAPH_API_VERSION = 'v21.0'

export interface WhatsAppButton {
  readonly id: string
  // Meta trunca/rechaza títulos de más de 20 caracteres.
  readonly title: string
}

async function callGraphApi(env: Env, body: Record<string, unknown>): Promise<void> {
  if (!env.WHATSAPP_PHONE_NUMBER_ID || !env.WHATSAPP_ACCESS_TOKEN) {
    console.warn(
      'WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID no configurados (wrangler secret put) — no se envía nada.',
    )
    return
  }

  const response = await fetch(
    `https://graph.facebook.com/${GRAPH_API_VERSION}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.WHATSAPP_ACCESS_TOKEN}`,
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
export async function sendWhatsAppText(env: Env, to: string, body: string): Promise<void> {
  await callGraphApi(env, {
    to,
    type: 'text',
    text: { body },
  })
}

// Botones de respuesta rápida (máximo 3 — límite de la API de Meta). Se usan
// para las acciones del chofer y la confirmación del familiar en vez de
// interpretar texto libre (rule del diseño original: evitar ambigüedad).
export async function sendWhatsAppButtons(
  env: Env,
  to: string,
  body: string,
  buttons: readonly WhatsAppButton[],
): Promise<void> {
  if (buttons.length === 0 || buttons.length > 3) {
    throw new Error(`sendWhatsAppButtons acepta entre 1 y 3 botones, recibió ${buttons.length.toString()}.`)
  }
  await callGraphApi(env, {
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
