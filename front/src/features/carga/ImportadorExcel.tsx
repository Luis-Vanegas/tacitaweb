import { useState, type ChangeEvent, type ReactNode } from 'react'
import type { AxiosError } from 'axios'
import Alert from '@mui/material/Alert'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import CircularProgress from '@mui/material/CircularProgress'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableContainer from '@mui/material/TableContainer'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Typography from '@mui/material/Typography'
import DownloadOutlinedIcon from '@mui/icons-material/DownloadOutlined'
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined'
import { http } from '@/shared/api/http'
import { endpoints } from '@/shared/api/endpoints'
import type { ErrorApi, ResultadoImportacion, TipoImportacion } from '@/shared/types'
import { descargarArchivo } from './descargarArchivo'

// Mismo límite que el FileInterceptor del backend (importacion.controller.ts):
// se valida antes de subir para no mandar 5+ MB solo para recibir un 413.
const TAMANO_MAXIMO = 5 * 1024 * 1024

interface ImportadorExcelProps {
  tipo: TipoImportacion
}

function mensajeError(error: unknown, fallback: string): string {
  return (error as AxiosError<Partial<ErrorApi>>).response?.data?.message ?? fallback
}

function Paso({ numero, titulo, children }: { numero: number; titulo: string; children: ReactNode }) {
  return (
    <Stack spacing={1}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
        {numero}. {titulo}
      </Typography>
      {children}
    </Stack>
  )
}

// Importación en dos pasos, igual que el backend: "Validar" hace un POST con
// confirmar=false (vista previa, no escribe nada) y "Confirmar carga" repite
// el POST con confirmar=true. El backend es todo o nada, así que confirmar
// solo se habilita cuando la vista previa del MISMO archivo vino sin errores.
export function ImportadorExcel({ tipo }: ImportadorExcelProps) {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null)
  const [vistaPrevia, setVistaPrevia] = useState<ResultadoImportacion | null>(null)
  const [resultado, setResultado] = useState<ResultadoImportacion | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [enCurso, setEnCurso] = useState<'plantilla' | 'validar' | 'confirmar' | null>(null)

  function limpiarResultados() {
    setVistaPrevia(null)
    setError(null)
  }

  function elegirArchivo(evento: ChangeEvent<HTMLInputElement>) {
    const elegido = evento.target.files?.[0] ?? null
    // Se limpia el input para que volver a elegir el mismo archivo (ya
    // corregido) dispare onChange de nuevo.
    evento.target.value = ''
    limpiarResultados()
    setResultado(null)
    if (elegido && elegido.size > TAMANO_MAXIMO) {
      setArchivo(null)
      setErrorArchivo(`"${elegido.name}" supera el máximo de 5 MB.`)
      return
    }
    setErrorArchivo(null)
    setArchivo(elegido)
  }

  async function descargarPlantilla() {
    setEnCurso('plantilla')
    setError(null)
    try {
      await descargarArchivo(endpoints.importacion.plantilla(tipo), `plantilla-${tipo}.xlsx`)
    } catch {
      setError('No se pudo descargar la plantilla. Intenta de nuevo.')
    } finally {
      setEnCurso(null)
    }
  }

  async function enviar(confirmar: boolean): Promise<ResultadoImportacion | null> {
    if (!archivo) return null
    const datos = new FormData()
    datos.append('archivo', archivo)
    const { data } = await http.post<ResultadoImportacion>(endpoints.importacion.importar(tipo), datos, {
      params: { confirmar },
    })
    return data
  }

  async function validar() {
    setEnCurso('validar')
    limpiarResultados()
    setResultado(null)
    try {
      setVistaPrevia(await enviar(false))
    } catch (e) {
      setError(mensajeError(e, 'No se pudo validar el archivo.'))
    } finally {
      setEnCurso(null)
    }
  }

  async function confirmar() {
    setEnCurso('confirmar')
    setError(null)
    try {
      const final = await enviar(true)
      if (final && final.errores.length > 0) {
        // Puede pasar si los datos cambiaron entre la vista previa y la
        // confirmación: el backend no escribió nada, se muestran los errores.
        setVistaPrevia(final)
        return
      }
      setResultado(final)
      setVistaPrevia(null)
      setArchivo(null)
    } catch (e) {
      setError(mensajeError(e, 'No se pudo completar la carga.'))
    } finally {
      setEnCurso(null)
    }
  }

  const ocupado = enCurso !== null
  const puedeConfirmar = !!vistaPrevia && vistaPrevia.errores.length === 0 && vistaPrevia.total > 0

  return (
    <Stack spacing={3}>
      <Paso numero={1} titulo="Descarga la plantilla">
        <Typography variant="body2" color="text.secondary">
          Usa siempre la plantilla vigente: las columnas deben coincidir con las que espera el sistema.
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={enCurso === 'plantilla' ? <CircularProgress size={16} /> : <DownloadOutlinedIcon />}
            onClick={descargarPlantilla}
            disabled={ocupado}
          >
            Descargar plantilla
          </Button>
        </Box>
      </Paso>

      <Paso numero={2} titulo="Selecciona el archivo diligenciado">
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }}>
          <Button component="label" variant="outlined" startIcon={<UploadFileOutlinedIcon />} disabled={ocupado}>
            Seleccionar archivo
            <input hidden type="file" accept=".xlsx" onChange={elegirArchivo} />
          </Button>
          <Typography variant="body2" color={archivo ? 'text.primary' : 'text.secondary'} noWrap>
            {archivo ? archivo.name : 'Ningún archivo seleccionado (.xlsx, máx. 5 MB)'}
          </Typography>
        </Stack>
        {errorArchivo && <Alert severity="warning">{errorArchivo}</Alert>}
      </Paso>

      <Paso numero={3} titulo="Valida y confirma">
        <Typography variant="body2" color="text.secondary">
          La validación no guarda nada. Si hay un solo error, no se carga ninguna fila: corrige el archivo y
          vuelve a validar.
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            onClick={validar}
            disabled={!archivo || ocupado}
            startIcon={enCurso === 'validar' ? <CircularProgress size={16} /> : undefined}
          >
            Validar
          </Button>
          <Button
            variant="contained"
            onClick={confirmar}
            disabled={!puedeConfirmar || ocupado}
            startIcon={enCurso === 'confirmar' ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            Confirmar carga
          </Button>
        </Stack>
      </Paso>

      {error && <Alert severity="error">{error}</Alert>}

      {vistaPrevia && (
        <Stack spacing={2}>
          <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
            <Chip label={`Filas: ${vistaPrevia.total}`} />
            <Chip color="success" variant="outlined" label={`A crear: ${vistaPrevia.creados}`} />
            <Chip color="info" variant="outlined" label={`A actualizar: ${vistaPrevia.actualizados}`} />
            <Chip variant="outlined" label={`Sin cambios: ${vistaPrevia.sinCambios}`} />
            {vistaPrevia.errores.length > 0 && (
              <Chip color="error" label={`Errores: ${vistaPrevia.errores.length}`} />
            )}
          </Stack>

          {vistaPrevia.errores.length > 0 ? (
            <TableContainer sx={{ maxHeight: 320, border: 1, borderColor: 'divider', borderRadius: 1 }}>
              <Table size="small" stickyHeader aria-label="Errores de la validación">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 72 }}>Fila</TableCell>
                    <TableCell sx={{ width: 180 }}>Columna</TableCell>
                    <TableCell>Mensaje</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {vistaPrevia.errores.map((e, i) => (
                    <TableRow key={`${e.fila}-${e.columna ?? ''}-${i}`}>
                      <TableCell>{e.fila}</TableCell>
                      <TableCell>{e.columna ?? '—'}</TableCell>
                      <TableCell>{e.mensaje}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : vistaPrevia.total === 0 ? (
            <Alert severity="warning">El archivo no tiene filas con datos.</Alert>
          ) : (
            <Alert severity="info">Sin errores. Revisa los totales y confirma la carga.</Alert>
          )}
        </Stack>
      )}

      {resultado && (
        <Alert severity="success">
          Carga completada: {resultado.creados} creados, {resultado.actualizados} actualizados y{' '}
          {resultado.sinCambios} sin cambios.
        </Alert>
      )}
    </Stack>
  )
}
