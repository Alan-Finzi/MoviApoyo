// Jerarquía de errores propia de la aplicación. Permite que Infrastructure
// traduzca errores de red, HTTP o parsing a un tipo que Application y
// Presentation ya conocen, sin que esas capas dependan de fetch/Axios ni
// de los detalles del backend.
export abstract class AppError extends Error {
  abstract readonly code: string

  protected constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = new.target.name
  }
}

export class NetworkError extends AppError {
  readonly code = 'NETWORK_ERROR'

  constructor(message = 'No se pudo establecer conexión con el servidor.', options?: ErrorOptions) {
    super(message, options)
  }
}

export class NotFoundError extends AppError {
  readonly code = 'NOT_FOUND'

  constructor(message = 'El recurso solicitado no existe.', options?: ErrorOptions) {
    super(message, options)
  }
}

export class ValidationError extends AppError {
  readonly code = 'VALIDATION_ERROR'
  readonly fieldErrors: Readonly<Record<string, string>>

  constructor(
    message = 'Los datos ingresados no son válidos.',
    fieldErrors: Record<string, string> = {},
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.fieldErrors = fieldErrors
  }
}

export class UnexpectedError extends AppError {
  readonly code = 'UNEXPECTED_ERROR'

  constructor(message = 'Ocurrió un error inesperado.', options?: ErrorOptions) {
    super(message, options)
  }
}

// Normaliza cualquier error capturado (de una Promise, de una librería
// externa, etc.) a la jerarquía de AppError, para que el resto del código
// nunca tenga que trabajar con `unknown`.
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (error instanceof Error) return new UnexpectedError(error.message, { cause: error })
  return new UnexpectedError('Ocurrió un error inesperado.', { cause: error })
}
