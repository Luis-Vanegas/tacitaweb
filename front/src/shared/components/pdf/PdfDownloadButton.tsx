import { useEffect, type ReactElement } from 'react'
import Button from '@mui/material/Button'
import CircularProgress from '@mui/material/CircularProgress'
import DownloadIcon from '@mui/icons-material/Download'
import { usePDF, type DocumentProps } from '@react-pdf/renderer'

interface PdfDownloadButtonProps {
  document: ReactElement<DocumentProps>
  fileName: string
  label?: string
}

// Botón MUI reutilizable para descargar cualquier documento @react-pdf/renderer
// (ProcesoPdfDocument, FrentePdfDocument, ...). Se usa usePDF en vez de
// PDFDownloadLink porque PDFDownloadLink renderiza su propio <a> y anidar un
// <button> de MUI adentro produce HTML inválido; con usePDF el Button de MUI
// queda como único elemento interactivo y disparamos la descarga a mano.
export function PdfDownloadButton({
  document: documentoPdf,
  fileName,
  label = 'Descargar PDF',
}: PdfDownloadButtonProps) {
  const [instance, actualizarDocumento] = usePDF()

  useEffect(() => {
    actualizarDocumento(documentoPdf)
    // Solo debe regenerar el blob cuando cambia el documento (ej. llega una
    // ficha nueva tras un refetch), no en cada render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentoPdf])

  function manejarClick() {
    if (!instance.url) return
    const enlace = window.document.createElement('a')
    enlace.href = instance.url
    enlace.download = fileName
    enlace.click()
  }

  const generando = instance.loading || !instance.url

  return (
    <Button
      variant="outlined"
      size="small"
      disabled={generando}
      onClick={manejarClick}
      startIcon={generando ? <CircularProgress size={16} /> : <DownloadIcon />}
    >
      {generando ? 'Generando…' : label}
    </Button>
  )
}
