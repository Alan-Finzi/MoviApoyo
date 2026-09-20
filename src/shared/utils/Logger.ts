// Logger centralizado. Nada en la aplicación debería llamar a console.log
// directamente: así se puede silenciar, redirigir a un servicio externo, o
// filtrar información sensible en un único lugar (rule 28).
//
// IMPORTANTE: nunca pasar tokens, contraseñas, documentos, información
// médica ni teléfonos completos como argumento de estas funciones.
const isProduction = import.meta.env.PROD

export const Logger = {
  info(message: string, context?: Record<string, unknown>): void {
    if (isProduction) return
    console.info(`[MoviApoyo] ${message}`, context ?? '')
  },

  warn(message: string, context?: Record<string, unknown>): void {
    console.warn(`[MoviApoyo] ${message}`, context ?? '')
  },

  error(message: string, error?: unknown): void {
    console.error(`[MoviApoyo] ${message}`, error ?? '')
  },
}
