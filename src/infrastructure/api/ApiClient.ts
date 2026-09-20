import {
  NetworkError,
  NotFoundError,
  UnexpectedError,
  ValidationError,
} from '@/shared/errors/AppError'
import { Logger } from '@/shared/utils/Logger'

export interface ApiClientOptions {
  readonly baseUrl: string
  readonly getAuthToken?: () => string | null
  readonly timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

// Cliente HTTP centralizado (rule 22): ninguna futura *RepositoryApi debería
// llamar a fetch directamente. Cuando exista backend, cada RepositoryApi se
// apoya en esta clase para no repetir baseURL, headers, timeout ni el
// mapeo de errores a la jerarquía de AppError.
//
// No se usa todavía en ningún lugar de la app (todos los repositorios son
// Mock por ahora): queda listo para el día que se conecte el backend real,
// sin necesidad de escribirlo desde cero.
export class ApiClient {
  constructor(private readonly options: ApiClientOptions) {}

  get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path)
  }

  post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('POST', path, body)
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PUT', path, body)
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>('PATCH', path, body)
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path)
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController()
    const timeoutId = setTimeout(
      () => controller.abort(),
      this.options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )

    const token = this.options.getAuthToken?.()
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    if (token) headers['Authorization'] = `Bearer ${token}`

    try {
      const response = await fetch(`${this.options.baseUrl}${path}`, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      if (response.status === 404) {
        throw new NotFoundError(`No se encontró el recurso solicitado: ${path}.`)
      }
      if (response.status === 422 || response.status === 400) {
        const payload = (await response.json().catch(() => ({}))) as {
          errors?: Record<string, string>
        }
        throw new ValidationError('Los datos enviados no son válidos.', payload.errors ?? {})
      }
      if (!response.ok) {
        throw new UnexpectedError(
          `El servidor respondió con un error (${response.status.toString()}).`,
        )
      }

      if (response.status === 204) return undefined as T
      return (await response.json()) as T
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) throw error
      Logger.error(`Fallo en la petición ${method} ${path}`, error)
      throw new NetworkError()
    } finally {
      clearTimeout(timeoutId)
    }
  }
}
