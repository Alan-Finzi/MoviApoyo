// Combina clases CSS condicionalmente. Reemplaza a la dependencia "clsx":
// el caso de uso es simple y no justifica sumar una librería externa.
export type ClassValue = string | false | null | undefined

export function classNames(...values: readonly ClassValue[]): string {
  return values.filter(Boolean).join(' ')
}
