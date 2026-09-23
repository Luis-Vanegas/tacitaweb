import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { ProcesoFicha } from '@/shared/types'

// Colores hardcodeados a propósito: @react-pdf/renderer usa su propio motor de
// layout (Yoga), no CSS-in-JS de MUI/Emotion, así que StyleSheet.create no
// puede leer los tokens de front/src/app/theme/tokens.ts. Se copian los
// mismos hex (navy #00233D, primary #00ABEE) para mantener la identidad visual.
const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#343A40',
  },
  header: {
    backgroundColor: '#00233D',
    color: '#FFFFFF',
    padding: 16,
    borderRadius: 4,
    marginBottom: 16,
  },
  headerTitulo: {
    fontSize: 16,
    fontWeight: 700,
  },
  headerSubtitulo: {
    fontSize: 10,
    marginTop: 4,
    color: '#B7D9E8',
  },
  seccion: {
    marginBottom: 16,
  },
  seccionTitulo: {
    fontSize: 12,
    fontWeight: 700,
    color: '#00233D',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#00ABEE',
    paddingBottom: 4,
  },
  filaDatos: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dato: {
    width: '50%',
    marginBottom: 6,
  },
  datoLabel: {
    fontSize: 8,
    color: '#6C757D',
    textTransform: 'uppercase',
  },
  datoValor: {
    fontSize: 10,
  },
  link: {
    fontSize: 10,
    color: '#00ABEE',
  },
  tabla: {
    display: 'flex',
    width: '100%',
  },
  filaTabla: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingVertical: 4,
  },
  filaTablaHeader: {
    flexDirection: 'row',
    backgroundColor: '#00233D',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  celdaFecha: {
    width: '20%',
    fontSize: 9,
    paddingHorizontal: 4,
  },
  celdaNota: {
    width: '80%',
    fontSize: 9,
    paddingHorizontal: 4,
  },
  celdaHeaderTexto: {
    fontSize: 9,
    fontWeight: 700,
    color: '#FFFFFF',
  },
  textoVacio: {
    fontSize: 9,
    color: '#6C757D',
    fontStyle: 'italic',
  },
})

function Dato({ label, valor }: { label: string; valor: string | null | undefined }) {
  return (
    <View style={styles.dato}>
      <Text style={styles.datoLabel}>{label}</Text>
      <Text style={styles.datoValor}>{valor && valor.length > 0 ? valor : '—'}</Text>
    </View>
  )
}

interface ProcesoPdfDocumentProps {
  proceso: ProcesoFicha
}

// Documento imprimible de la ficha de un proceso: datos clave, bitácora e
// interventorías vinculadas. Consumido por PdfDownloadButton.
export function ProcesoPdfDocument({ proceso }: ProcesoPdfDocumentProps) {
  const tieneInterventorias = proceso.interventorias.length > 0
  const esInterventoria = proceso.tipo === 'INTERVENTORIA'

  return (
    <Document title={`Proceso ${proceso.numeroContrato ?? proceso.id}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>{proceso.actividad}</Text>
          <Text style={styles.headerSubtitulo}>
            {proceso.dependencia} · {proceso.proyecto} · {proceso.estado}
          </Text>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Datos del proceso</Text>
          <View style={styles.filaDatos}>
            <Dato label="Número de contrato" valor={proceso.numeroContrato} />
            <Dato label="Número de necesidad" valor={proceso.numeroNecesidad} />
            <Dato label="Tipo" valor={proceso.tipo} />
            <Dato label="Estado" valor={proceso.estado} />
            <Dato label="Fecha de inicio" valor={proceso.fechaInicio} />
            <Dato label="Fecha de terminación" valor={proceso.fechaTerminacion} />
            <Dato label="Contratista" valor={proceso.contratista} />
            <Dato label="Dependencia" valor={proceso.dependencia} />
            <Dato label="Proyecto" valor={proceso.proyecto} />
            <Dato
              label="Días restantes"
              valor={proceso.diasRestantes != null ? String(proceso.diasRestantes) : null}
            />
          </View>
          {proceso.linkSecop ? (
            <View style={{ marginTop: 4 }}>
              <Text style={styles.datoLabel}>Link SECOP</Text>
              <Link src={proceso.linkSecop} style={styles.link}>
                {proceso.linkSecop}
              </Link>
            </View>
          ) : null}
          {proceso.observacion ? (
            <View style={{ marginTop: 8 }}>
              <Text style={styles.datoLabel}>Observación</Text>
              <Text style={styles.datoValor}>{proceso.observacion}</Text>
            </View>
          ) : null}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Bitácora</Text>
          {proceso.bitacora.length === 0 ? (
            <Text style={styles.textoVacio}>Sin notas registradas.</Text>
          ) : (
            <View style={styles.tabla}>
              <View style={styles.filaTablaHeader}>
                <Text style={[styles.celdaFecha, styles.celdaHeaderTexto]}>Fecha</Text>
                <Text style={[styles.celdaNota, styles.celdaHeaderTexto]}>Nota</Text>
              </View>
              {proceso.bitacora.map((nota) => (
                <View style={styles.filaTabla} key={nota.id}>
                  <Text style={styles.celdaFecha}>{nota.fecha}</Text>
                  <Text style={styles.celdaNota}>{nota.nota}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {(esInterventoria || tieneInterventorias) && (
          <View style={styles.seccion}>
            <Text style={styles.seccionTitulo}>Interventoría</Text>
            {esInterventoria && proceso.procesoSupervisadoId ? (
              <Text style={styles.datoValor}>
                Este proceso es interventoría del proceso {proceso.procesoSupervisadoId}.
              </Text>
            ) : null}
            {tieneInterventorias ? (
              <View style={{ marginTop: esInterventoria ? 8 : 0 }}>
                <Text style={styles.datoLabel}>Interventorías vinculadas</Text>
                {proceso.interventorias.map((interventoria) => (
                  <Text style={styles.datoValor} key={interventoria.id}>
                    {interventoria.numeroContrato ?? interventoria.id} —{' '}
                    {interventoria.contratista ?? 'Sin contratista'} ({interventoria.estado})
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        )}
      </Page>
    </Document>
  )
}
