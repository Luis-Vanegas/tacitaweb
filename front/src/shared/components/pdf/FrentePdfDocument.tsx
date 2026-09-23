import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import type { FrenteDetalleNormalizado } from '@/shared/utils/normalizar'

// Mismos hex de tokens.ts copiados a mano (ver comentario en ProcesoPdfDocument):
// @react-pdf/renderer no puede leer el theme de MUI/Emotion.
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
  kpiFila: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  kpiTarjeta: {
    width: '25%',
    marginBottom: 8,
    paddingRight: 8,
  },
  kpiValor: {
    fontSize: 16,
    fontWeight: 700,
    color: '#00233D',
  },
  kpiLabel: {
    fontSize: 8,
    color: '#6C757D',
    textTransform: 'uppercase',
  },
  filaEstado: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  puntoEstado: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  textoEstado: {
    fontSize: 9,
  },
  listaTexto: {
    fontSize: 9,
    marginBottom: 2,
  },
  textoVacio: {
    fontSize: 9,
    color: '#6C757D',
    fontStyle: 'italic',
  },
})

interface FrentePdfDocumentProps {
  frente: FrenteDetalleNormalizado
}

// Documento imprimible del resumen de un frente: KPIs, conteo por estado y
// dependencias involucradas. Consumido por PdfDownloadButton.
export function FrentePdfDocument({ frente }: FrentePdfDocumentProps) {
  return (
    <Document title={`Frente ${frente.nombre}`}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.headerTitulo}>{frente.nombre}</Text>
          {frente.descripcion ? (
            <Text style={styles.headerSubtitulo}>{frente.descripcion}</Text>
          ) : null}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Resumen</Text>
          <View style={styles.kpiFila}>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.totalProcesos}</Text>
              <Text style={styles.kpiLabel}>Procesos totales</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.precontractual}</Text>
              <Text style={styles.kpiLabel}>Precontractual</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.enEjecucion}</Text>
              <Text style={styles.kpiLabel}>En ejecución</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.terminados}</Text>
              <Text style={styles.kpiLabel}>Terminados</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.alertas}</Text>
              <Text style={styles.kpiLabel}>Alertas</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.proximosVencer}</Text>
              <Text style={styles.kpiLabel}>Próximos a vencer</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.personalActual}</Text>
              <Text style={styles.kpiLabel}>Personal actual</Text>
            </View>
            <View style={styles.kpiTarjeta}>
              <Text style={styles.kpiValor}>{frente.personalPendiente}</Text>
              <Text style={styles.kpiLabel}>Personal pendiente</Text>
            </View>
          </View>
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Procesos por estado</Text>
          {frente.conteoPorEstado.length === 0 ? (
            <Text style={styles.textoVacio}>Sin procesos registrados.</Text>
          ) : (
            frente.conteoPorEstado.map((item) => (
              <View style={styles.filaEstado} key={item.estadoId}>
                <View style={[styles.puntoEstado, { backgroundColor: item.color }]} />
                <Text style={styles.textoEstado}>
                  {item.estado}: {item.total}
                </Text>
              </View>
            ))
          )}
        </View>

        <View style={styles.seccion}>
          <Text style={styles.seccionTitulo}>Dependencias involucradas</Text>
          {frente.dependenciasInvolucradas.length === 0 ? (
            <Text style={styles.textoVacio}>Sin dependencias registradas.</Text>
          ) : (
            frente.dependenciasInvolucradas.map((dep) => (
              <Text style={styles.listaTexto} key={dep.id}>
                {dep.nombre}
              </Text>
            ))
          )}
        </View>
      </Page>
    </Document>
  )
}
