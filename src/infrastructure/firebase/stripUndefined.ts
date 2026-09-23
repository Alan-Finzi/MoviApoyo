// Firestore rechaza escribir campos con valor `undefined` (a diferencia de
// `null`). Varias entidades del dominio tienen campos opcionales
// (`location?`, `observations?`, etc.) que en TS quedan como `undefined`
// cuando no se completan — hay que sacarlos antes de mandarlos a Firestore.
export function stripUndefined<T extends object>(value: T): Partial<T> {
  const entries = Object.entries(value).filter(([, fieldValue]) => fieldValue !== undefined)
  return Object.fromEntries(entries) as Partial<T>
}
