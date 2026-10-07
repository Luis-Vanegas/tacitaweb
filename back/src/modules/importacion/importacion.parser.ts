// Lectura tolerante de un .xlsx subido por el usuario: los encabezados se
// reconocen sin importar tildes/mayúsculas/espacios/puntuación, y las celdas
// se aplanan desde las formas que entrega exceljs (rich text, fórmulas,
// hipervínculos, fechas) a string | number | Date. Sin dependencias de BD:
// la resolución de nombres a ids vive en importacion.service.ts.
import { Workbook } from 'exceljs';
import type { CellValue } from 'exceljs';

export type ValorCelda = string | number | Date | null;

export type Conversion<T> =
  { ok: true; valor: T | null } | { ok: false; error: string };

export interface ColumnaPlantilla<K extends string> {
  clave: K;
  // Texto exacto que lleva la plantilla generada.
  encabezado: string;
  // Variantes aceptadas al leer (se comparan normalizadas).
  alias?: string[];
  requerida?: boolean;
  // Para Link SECOP: si la celda es un hipervínculo se toma la URL, no el texto visible.
  hyperlink?: boolean;
  ancho?: number;
}

export interface FilaLeida<K extends string> {
  // Número de fila tal como lo ve el usuario en Excel (encabezado = 1).
  fila: number;
  valores: Partial<Record<K, ValorCelda>>;
}

// Más tolerante que core.clave_texto (también quita tildes): "Gestion" y
// "Gestión" resuelven igual. Quien indexe con esto debe detectar ambigüedades.
export function normalizarTexto(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// "N.º contrato", "No. contrato" y "numero contrato" deben caer en claves
// comparables: se descarta todo lo que no sea letra o dígito.
function claveEncabezado(texto: string): string {
  return normalizarTexto(texto).replace(/[^a-z0-9]/g, '');
}

export function leerCelda(
  valor: CellValue,
  preferirHyperlink = false,
): ValorCelda {
  if (valor === null || valor === undefined) {
    return null;
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    return texto === '' ? null : texto;
  }
  if (typeof valor === 'number' || valor instanceof Date) {
    return valor;
  }
  if (typeof valor === 'boolean') {
    return valor ? 'true' : 'false';
  }
  if ('richText' in valor) {
    return leerCelda(valor.richText.map((parte) => parte.text).join(''));
  }
  if ('hyperlink' in valor) {
    if (preferirHyperlink && valor.hyperlink) {
      return leerCelda(valor.hyperlink);
    }
    // En archivos reales el texto visible a veces llega como rich text.
    return leerCelda(valor.text as CellValue);
  }
  if ('formula' in valor || 'sharedFormula' in valor) {
    return leerCelda((valor.result ?? null) as CellValue, preferirHyperlink);
  }
  // CellErrorValue (#N/A, #REF!...): se trata como vacía.
  return null;
}

function fechaIso(anio: number, mes: number, dia: number): string | null {
  const fecha = new Date(Date.UTC(anio, mes - 1, dia));
  // Date "corrige" 31/02 a 03/03: si cambió, la fecha no existe.
  if (
    fecha.getUTCFullYear() !== anio ||
    fecha.getUTCMonth() !== mes - 1 ||
    fecha.getUTCDate() !== dia
  ) {
    return null;
  }
  return fecha.toISOString().slice(0, 10);
}

// Excel cuenta días desde 1899-12-30 (arrastra el bug del 29/02/1900).
const EPOCA_EXCEL_MS = Date.UTC(1899, 11, 30);
const MS_POR_DIA = 24 * 60 * 60 * 1000;

export function aFecha(valor: ValorCelda): Conversion<string> {
  if (valor === null) {
    return { ok: true, valor: null };
  }
  if (valor instanceof Date) {
    // exceljs entrega las fechas como medianoche UTC del día de la celda.
    return { ok: true, valor: valor.toISOString().slice(0, 10) };
  }
  if (typeof valor === 'number') {
    if (Number.isInteger(valor) && valor > 0) {
      const fecha = new Date(EPOCA_EXCEL_MS + valor * MS_POR_DIA);
      return { ok: true, valor: fecha.toISOString().slice(0, 10) };
    }
  } else {
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(valor);
    const local = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(valor);
    const resultado = iso
      ? fechaIso(Number(iso[1]), Number(iso[2]), Number(iso[3]))
      : local
        ? fechaIso(Number(local[3]), Number(local[2]), Number(local[1]))
        : null;
    if (resultado) {
      return { ok: true, valor: resultado };
    }
  }
  return { ok: false, error: 'Fecha inválida (use AAAA-MM-DD o DD/MM/AAAA)' };
}

export function aEntero(
  valor: ValorCelda,
  minimo: number,
  maximo = Number.MAX_SAFE_INTEGER,
): Conversion<number> {
  if (valor === null) {
    return { ok: true, valor: null };
  }
  const numero =
    typeof valor === 'number'
      ? valor
      : typeof valor === 'string' && /^-?\d+$/.test(valor)
        ? Number(valor)
        : NaN;
  if (!Number.isInteger(numero) || numero < minimo || numero > maximo) {
    const rango =
      maximo === Number.MAX_SAFE_INTEGER
        ? `mayor o igual a ${minimo}`
        : `entre ${minimo} y ${maximo}`;
    return { ok: false, error: `Debe ser un número entero ${rango}` };
  }
  return { ok: true, valor: numero };
}

// N.º contrato / necesidad: Excel los convierte a número si la celda no es
// texto; el CHECK de la BD exige solo dígitos.
export function aDigitos(valor: ValorCelda): Conversion<string> {
  if (valor === null) {
    return { ok: true, valor: null };
  }
  const texto =
    typeof valor === 'number' && Number.isInteger(valor) && valor >= 0
      ? String(valor)
      : typeof valor === 'string'
        ? valor.trim()
        : '';
  if (!/^[0-9]+$/.test(texto)) {
    return { ok: false, error: 'Debe contener solo dígitos' };
  }
  return { ok: true, valor: texto };
}

export function aTexto(valor: ValorCelda): string | null {
  if (valor === null) {
    return null;
  }
  return valor instanceof Date
    ? valor.toISOString().slice(0, 10)
    : String(valor);
}

// Lee la primera hoja del libro. Lanza si el buffer no es un .xlsx válido.
export async function leerHoja<K extends string>(
  buffer: Buffer,
  columnas: ColumnaPlantilla<K>[],
): Promise<{ filas: FilaLeida<K>[]; columnasFaltantes: string[] }> {
  const workbook = new Workbook();
  // exceljs tipa load() con su propio Buffer (ver frentes.service.spec.ts).
  await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
  const hoja = workbook.worksheets[0];
  if (!hoja) {
    return { filas: [], columnasFaltantes: columnas.map((c) => c.encabezado) };
  }

  const porEncabezado = new Map<string, ColumnaPlantilla<K>>();
  for (const columna of columnas) {
    for (const nombre of [columna.encabezado, ...(columna.alias ?? [])]) {
      porEncabezado.set(claveEncabezado(nombre), columna);
    }
  }

  // número de columna de Excel -> columna de la plantilla
  const mapa = new Map<number, ColumnaPlantilla<K>>();
  hoja.getRow(1).eachCell((celda, numeroColumna) => {
    const texto = aTexto(leerCelda(celda.value));
    const columna = texto
      ? porEncabezado.get(claveEncabezado(texto))
      : undefined;
    if (columna && ![...mapa.values()].includes(columna)) {
      mapa.set(numeroColumna, columna);
    }
  });

  const presentes = new Set(mapa.values());
  const columnasFaltantes = columnas
    .filter((c) => c.requerida && !presentes.has(c))
    .map((c) => c.encabezado);

  const filas: FilaLeida<K>[] = [];
  hoja.eachRow((row, numeroFila) => {
    if (numeroFila === 1) {
      return;
    }
    const valores: Partial<Record<K, ValorCelda>> = {};
    let vacia = true;
    for (const [numeroColumna, columna] of mapa) {
      const valor = leerCelda(
        row.getCell(numeroColumna).value,
        columna.hyperlink,
      );
      if (valor !== null) {
        valores[columna.clave] = valor;
        vacia = false;
      }
    }
    if (!vacia) {
      filas.push({ fila: numeroFila, valores });
    }
  });

  return { filas, columnasFaltantes };
}
