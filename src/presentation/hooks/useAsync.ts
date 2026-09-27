import { useCallback, useEffect, useState } from 'react'

import { toAppError } from '@/shared/errors/AppError'
import type { AsyncState } from '@/shared/types/AsyncState'
import { isEmptyResult } from '@/shared/types/AsyncState'

export interface UseAsyncResult<T> {
  readonly state: AsyncState<T>
  readonly reload: () => void
}

// Hook base para toda pantalla que obtiene datos (rule 27): unifica el
// manejo de loading/success/empty/error para no repetir ese cableado en
// cada hook específico (useTrips, useDrivers, etc.).
export function useAsync<T>(loader: () => Promise<T>, deps: readonly unknown[]): UseAsyncResult<T> {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' })
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    // Si ya hay datos en pantalla, un refetch (ej. useLiveTripUpdates
    // reaccionando a la simulación, o el reload() de otra pantalla) no debe
    // pasar por "loading": eso desmonta la página entera —incluyendo un
    // modal abierto, como el de "Registrar incidente"— y el coordinador
    // pierde lo que estaba escribiendo. Solo la carga inicial (o un reload
    // después de error/vacío, sin nada que conservar en pantalla) muestra el
    // spinner.
    setState((previous) =>
      previous.status === 'success' || previous.status === 'empty'
        ? previous
        : { status: 'loading' },
    )

    loader()
      .then((data) => {
        if (cancelled) return
        setState(isEmptyResult(data) ? { status: 'empty' } : { status: 'success', data })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        setState({ status: 'error', message: toAppError(error).message })
      })

    return () => {
      cancelled = true
    }
    // Las dependencias las decide quien llama a useAsync (rule: no repetir
    // el mismo bug en cada hook). reloadToken fuerza un refetch manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, reloadToken])

  const reload = useCallback(() => setReloadToken((token) => token + 1), [])

  return { state, reload }
}
