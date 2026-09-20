// Store observable mínimo, sin dependencias externas. Reemplaza a Redux o
// Zustand para el caso de uso real que tenemos: un puñado de colecciones en
// memoria (mientras no hay backend) que varias pantallas necesitan leer de
// forma reactiva. Se consume con React vía `useSyncExternalStore` (nativo
// desde React 18), así los componentes se actualizan solos cuando cambian
// los datos "en el servidor" (hoy, en memoria; mañana, el backend real).
export interface Store<T> {
  getState(): T
  setState(updater: (state: T) => T): void
  subscribe(listener: () => void): () => void
}

export function createStore<T>(initialState: T): Store<T> {
  let state = initialState
  const listeners = new Set<() => void>()

  return {
    getState() {
      return state
    },
    setState(updater) {
      state = updater(state)
      listeners.forEach((listener) => listener())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
