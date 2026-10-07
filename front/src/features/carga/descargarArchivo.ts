import { http } from '@/shared/api/http'

// Mismo enfoque que el export de FrenteDetallePage: GET como blob y descarga
// con un <a download>. El nombre sale del Content-Disposition real del
// backend (`attachment; filename="plantilla-<tipo>.xlsx"`), con fallback.
function nombreDesdeContentDisposition(header: string | undefined, fallback: string): string {
  const match = header?.match(/filename="?([^"; ]+)"?/i)
  return match?.[1] ?? fallback
}

export async function descargarArchivo(url: string, nombreFallback: string): Promise<void> {
  const respuesta = await http.get(url, { responseType: 'blob' })
  const nombre = nombreDesdeContentDisposition(respuesta.headers['content-disposition'], nombreFallback)
  const objetoUrl = window.URL.createObjectURL(respuesta.data as Blob)
  const enlace = window.document.createElement('a')
  enlace.href = objetoUrl
  enlace.download = nombre
  enlace.click()
  window.URL.revokeObjectURL(objetoUrl)
}
