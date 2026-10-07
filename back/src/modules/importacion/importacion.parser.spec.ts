import { Workbook } from 'exceljs';
import {
  aDigitos,
  aEntero,
  aFecha,
  ColumnaPlantilla,
  leerCelda,
  leerHoja,
  normalizarTexto,
} from './importacion.parser';

async function libro(filas: unknown[][]): Promise<Buffer> {
  const workbook = new Workbook();
  const hoja = workbook.addWorksheet('Datos');
  filas.forEach((fila) => hoja.addRow(fila));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

const COLUMNAS: ColumnaPlantilla<'contrato' | 'fecha' | 'link'>[] = [
  {
    clave: 'contrato',
    encabezado: 'N.º contrato',
    alias: ['numero contrato'],
    requerida: true,
  },
  { clave: 'fecha', encabezado: 'Fecha terminación' },
  { clave: 'link', encabezado: 'Link SECOP', hyperlink: true },
];

describe('importacion.parser', () => {
  describe('normalizarTexto', () => {
    it('quita tildes, pasa a minúsculas y colapsa espacios', () => {
      expect(normalizarTexto('  Secretaría   de  SEGURIDAD ')).toBe(
        'secretaria de seguridad',
      );
    });
  });

  describe('leerCelda', () => {
    it('aplana rich text, fórmulas e hipervínculos', () => {
      expect(
        leerCelda({ richText: [{ text: 'Hola ' }, { text: 'mundo' }] }),
      ).toBe('Hola mundo');
      expect(leerCelda({ formula: 'A1+1', result: 5 })).toBe(5);
      expect(leerCelda({ error: '#N/A' })).toBeNull();
      expect(
        leerCelda({ text: 'ver', hyperlink: 'https://secop.gov.co/x' }),
      ).toBe('ver');
      expect(
        leerCelda({ text: 'ver', hyperlink: 'https://secop.gov.co/x' }, true),
      ).toBe('https://secop.gov.co/x');
      expect(leerCelda('   ')).toBeNull();
      expect(leerCelda(undefined)).toBeNull();
    });
  });

  describe('conversiones', () => {
    it('aFecha acepta Date, ISO, dd/mm/aaaa y serial de Excel', () => {
      expect(aFecha(new Date(Date.UTC(2026, 2, 5)))).toEqual({
        ok: true,
        valor: '2026-03-05',
      });
      expect(aFecha('2026-03-05')).toEqual({ ok: true, valor: '2026-03-05' });
      expect(aFecha('5/3/2026')).toEqual({ ok: true, valor: '2026-03-05' });
      expect(aFecha(46086)).toEqual({ ok: true, valor: '2026-03-05' });
      expect(aFecha(null)).toEqual({ ok: true, valor: null });
      expect(aFecha('31/02/2026').ok).toBe(false);
      expect(aFecha('mañana').ok).toBe(false);
    });

    it('aEntero valida enteros y rango mínimo', () => {
      expect(aEntero(12, 0)).toEqual({ ok: true, valor: 12 });
      expect(aEntero('12', 0)).toEqual({ ok: true, valor: 12 });
      expect(aEntero(1.5, 0).ok).toBe(false);
      expect(aEntero(-1, 0).ok).toBe(false);
      expect(aEntero(2019, 2020, 2100).ok).toBe(false);
    });

    it('aDigitos acepta números de Excel y rechaza letras', () => {
      expect(aDigitos(4600012345)).toEqual({ ok: true, valor: '4600012345' });
      expect(aDigitos(' 0123 ')).toEqual({ ok: true, valor: '0123' });
      expect(aDigitos('46-001').ok).toBe(false);
    });
  });

  describe('leerHoja', () => {
    it('mapea encabezados sin importar tildes, mayúsculas, espacios o alias', async () => {
      const buffer = await libro([
        ['  NUMERO   contrato ', 'fecha terminacion', 'link secop'],
        ['4600001', '2026-12-31', 'https://secop.gov.co/1'],
      ]);

      const { filas, columnasFaltantes } = await leerHoja(buffer, COLUMNAS);

      expect(columnasFaltantes).toEqual([]);
      expect(filas).toEqual([
        {
          fila: 2,
          valores: {
            contrato: '4600001',
            fecha: '2026-12-31',
            link: 'https://secop.gov.co/1',
          },
        },
      ]);
    });

    it('omite filas vacías y conserva el número de fila que ve el usuario', async () => {
      const buffer = await libro([
        ['N.º contrato', 'Fecha terminación'],
        ['1', null],
        [null, null],
        ['  ', null],
        ['2', null],
      ]);

      const { filas } = await leerHoja(buffer, COLUMNAS);

      expect(filas.map((f) => f.fila)).toEqual([2, 5]);
    });

    it('reporta las columnas requeridas que faltan', async () => {
      const buffer = await libro([['Fecha terminación'], ['2026-01-01']]);

      const { columnasFaltantes } = await leerHoja(buffer, COLUMNAS);

      expect(columnasFaltantes).toEqual(['N.º contrato']);
    });
  });
});
