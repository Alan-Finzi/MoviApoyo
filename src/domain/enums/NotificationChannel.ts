// Un único canal por ahora (WhatsApp), pero modelado como conjunto cerrado
// para poder sumar EMAIL, SMS o PUSH en el futuro sin romper el contrato de
// NotificationService (rule 13: "preferencias de notificación").
export const NotificationChannel = {
  WHATSAPP: 'WHATSAPP',
} as const

export type NotificationChannel = (typeof NotificationChannel)[keyof typeof NotificationChannel]
