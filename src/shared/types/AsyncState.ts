// Estado uniforme para cualquier hook que obtenga datos (rule: toda pantalla
// que obtenga datos debe contemplar loading / success / empty / error).
// Los componentes LoadingState, EmptyState y ErrorState consumen este tipo.
export type AsyncState<T> =
  | { readonly status: 'loading' }
  | { readonly status: 'success'; readonly data: T }
  | { readonly status: 'empty' }
  | { readonly status: 'error'; readonly message: string }

export function isEmptyResult(data: unknown): boolean {
  if (Array.isArray(data)) return data.length === 0
  return data === null || data === undefined
}
