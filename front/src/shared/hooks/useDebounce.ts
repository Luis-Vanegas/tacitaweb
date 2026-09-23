import { useEffect, useState } from 'react'

// Devuelve `valor` recién después de `delayMs` sin cambios. Usado en los
// filtros de búsqueda de ProcesosTab para no disparar un fetch por tecla.
export function useDebounce<T>(valor: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(valor)

  useEffect(() => {
    const timeout = setTimeout(() => setDebounced(valor), delayMs)
    return () => clearTimeout(timeout)
  }, [valor, delayMs])

  return debounced
}
