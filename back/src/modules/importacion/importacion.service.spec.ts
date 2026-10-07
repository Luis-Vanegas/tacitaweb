import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { OrigenSeguimiento } from '@/database/entities/seguimiento.entity';
import {
  COLUMNAS_PERSONAL,
  COLUMNAS_PROCESOS,
  ImportacionService,
  TipoImportacion,
} from './importacion.service';

const ENCABEZADO_PROCESOS = COLUMNAS_PROCESOS.map((c) => c.encabezado);
const ENCABEZADO_PERSONAL = COLUMNAS_PERSONAL.map((c) => c.encabezado);

async function libro(filas: unknown[][]): Promise<Buffer> {
  const workbook = new Workbook();
  const hoja = workbook.addWorksheet('Datos');
  filas.forEach((fila) => hoja.addRow(fila));
  return Buffer.from(await workbook.xlsx.writeBuffer());
}

// Fila de procesos en el orden de COLUMNAS_PROCESOS.
function proceso(campos: Partial<Record<string, unknown>>): unknown[] {
  return [
    campos.dependencia ?? 'Secretaría de Seguridad',
    campos.actividad ?? 'Vigilancia',
    campos.contratista ?? null,
    campos.tipo ?? null,
    campos.contrato ?? null,
    campos.necesidad ?? null,
    campos.estado ?? 'En ejecución',
    campos.inicio ?? null,
    campos.terminacion ?? null,
    campos.link ?? null,
    campos.observacion ?? null,
    campos.frente ?? null,
  ];
}

const CATALOGOS = {
  estados: [
    { id: 1, codigo: 'PRECONTRACTUAL', nombre: 'Precontractual' },
    { id: 4, codigo: 'EN_EJECUCION', nombre: 'En ejecución' },
  ],
  dependencias: [{ id: 2, nombre: 'Secretaría de Seguridad' }],
  proyectos: [],
  contratistas: [{ id: 30, nombre: 'Vigías S.A.S.' }],
  categoriasActividad: [],
  tiposPersonal: [
    { id: 5, nombre: 'Gestores territoriales' },
    { id: 6, nombre: 'Guardas' },
  ],
  actividades: [
    {
      id: 7,
      nombre: 'Vigilancia',
      dependenciaId: 2,
      dependencia: 'Secretaría de Seguridad',
    },
  ],
};

describe('ImportacionService', () => {
  let procesoRepo: { find: jest.Mock };
  let corteRepo: { find: jest.Mock };
  let frenteRepo: { find: jest.Mock };
  let usuarioFrenteRepo: { exist: jest.Mock };
  let catalogosService: { obtener: jest.Mock };
  let procesosService: {
    insertarProceso: jest.Mock;
    aplicarCambioEstado: jest.Mock;
    verificarScope: jest.Mock;
  };
  let personalService: { verificarScope: jest.Mock };
  let manager: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
  let queryRunner: Record<string, jest.Mock | unknown>;
  let dataSource: { createQueryRunner: jest.Mock };
  let service: ImportacionService;

  const admin = { id: 'admin-1', email: 'a@a.com', rol: RolUsuario.ADMIN };
  const editor = { id: 'editor-1', email: 'e@e.com', rol: RolUsuario.EDITOR };

  beforeEach(() => {
    procesoRepo = { find: jest.fn().mockResolvedValue([]) };
    corteRepo = { find: jest.fn().mockResolvedValue([]) };
    frenteRepo = {
      find: jest
        .fn()
        .mockResolvedValue([
          { id: 3, slug: 'operativa-seguridad', nombre: 'Operativa/Seguridad' },
        ]),
    };
    usuarioFrenteRepo = { exist: jest.fn().mockResolvedValue(true) };
    catalogosService = { obtener: jest.fn().mockResolvedValue(CATALOGOS) };
    procesosService = {
      insertarProceso: jest.fn().mockResolvedValue('100'),
      aplicarCambioEstado: jest.fn().mockResolvedValue(undefined),
      verificarScope: jest.fn().mockResolvedValue(undefined),
    };
    personalService = {
      verificarScope: jest.fn().mockResolvedValue(undefined),
    };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      query: jest.fn(),
      manager,
    };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };

    service = new ImportacionService(
      procesoRepo as any,
      corteRepo as any,
      frenteRepo as any,
      usuarioFrenteRepo as any,
      catalogosService as any,
      procesosService as any,
      personalService as any,
      dataSource as any,
    );
  });

  describe('procesos', () => {
    const existente = {
      id: '50',
      actividadId: 7,
      estadoId: 1,
      contratistaId: null,
      tipo: 'PRINCIPAL',
      numeroContrato: '4600001',
      numeroNecesidad: '900',
      fechaInicio: '2026-01-01',
      fechaTerminacion: null,
      linkSecop: null,
      observacion: null,
    };

    it('en vista previa cuenta creaciones y actualizaciones sin escribir nada', async () => {
      procesoRepo.find.mockResolvedValueOnce([existente]);
      const buffer = await libro([
        ENCABEZADO_PROCESOS,
        proceso({ contrato: '4600001', estado: 'en ejecucion' }),
        proceso({ necesidad: 901, frente: 'operativa-seguridad' }),
      ]);

      const resultado = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        false,
        admin,
      );

      expect(resultado).toEqual({
        total: 2,
        creados: 1,
        actualizados: 1,
        sinCambios: 0,
        errores: [],
        confirmado: false,
      });
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('reporta errores por fila con el número de fila de Excel', async () => {
      const buffer = await libro([
        ENCABEZADO_PROCESOS,
        proceso({ actividad: 'No existe', contrato: '1' }),
        proceso({
          contrato: '2',
          inicio: '2026-05-01',
          terminacion: '2026-04-01',
        }),
        proceso({ contrato: '3' }),
        proceso({ contrato: '3' }),
        proceso({ contrato: '4', link: 'http://inseguro' }),
      ]);

      const resultado = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        true,
        admin,
      );

      expect(resultado.errores).toEqual([
        {
          fila: 2,
          columna: 'Actividad',
          mensaje: expect.stringContaining('no existe'),
        },
        { fila: 3, columna: 'Fecha terminación', mensaje: expect.any(String) },
        {
          fila: 5,
          columna: undefined,
          mensaje: expect.stringContaining('fila 4'),
        },
        { fila: 6, columna: 'Link SECOP', mensaje: expect.any(String) },
      ]);
      // Todo o nada: con errores no se abre la transacción aunque se confirme.
      expect(resultado.confirmado).toBe(false);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('exige N.º contrato o N.º necesidad para poder identificar el proceso', async () => {
      const buffer = await libro([ENCABEZADO_PROCESOS, proceso({})]);

      const { errores } = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        false,
        admin,
      );

      expect(errores).toEqual([
        {
          fila: 2,
          columna: undefined,
          mensaje: expect.stringContaining('N.º contrato'),
        },
      ]);
    });

    it('al confirmar escribe todo en una transacción auditada y registra el cambio de estado', async () => {
      procesoRepo.find.mockResolvedValueOnce([existente]);
      const buffer = await libro([
        ENCABEZADO_PROCESOS,
        proceso({
          contrato: 4600001,
          estado: 'EN_EJECUCION',
          terminacion: new Date(Date.UTC(2026, 11, 31)),
        }),
        proceso({
          contrato: '4600002',
          contratista: 'vigias s.a.s.',
          tipo: 'Interventoría',
          frente: 'Operativa/Seguridad',
        }),
      ]);

      const resultado = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        true,
        admin,
      );

      expect(resultado).toMatchObject({
        creados: 1,
        actualizados: 1,
        confirmado: true,
      });
      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(queryRunner.query).toHaveBeenCalledWith(
        'select set_config($1, $2, true)',
        ['app.usuario_id', 'admin-1'],
      );
      expect(manager.update).toHaveBeenCalledWith(ProcesoContratacion, '50', {
        fechaTerminacion: '2026-12-31',
        updatedBy: 'admin-1',
      });
      expect(procesosService.aplicarCambioEstado).toHaveBeenCalledWith(
        manager,
        '50',
        { estadoId: 4, nota: expect.stringContaining('En ejecución') },
        'admin-1',
        OrigenSeguimiento.EXCEL,
      );
      expect(procesosService.insertarProceso).toHaveBeenCalledWith(
        manager,
        expect.objectContaining({
          actividadId: 7,
          estadoId: 4,
          contratistaId: 30,
          tipo: 'INTERVENTORIA',
          numeroContrato: '4600002',
          frentes: [3],
        }),
        'admin-1',
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('cuenta como sin cambios una fila igual a lo que ya está en la BD', async () => {
      procesoRepo.find.mockResolvedValueOnce([existente]);
      const buffer = await libro([
        ENCABEZADO_PROCESOS,
        proceso({ contrato: '4600001', estado: 'Precontractual' }),
      ]);

      const resultado = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        true,
        admin,
      );

      expect(resultado).toMatchObject({ sinCambios: 1, actualizados: 0 });
      expect(manager.update).not.toHaveBeenCalled();
    });

    it('EDITOR sin el frente del proceso recibe un error de fila', async () => {
      procesoRepo.find.mockResolvedValueOnce([existente]);
      procesosService.verificarScope.mockRejectedValueOnce(
        new ForbiddenException(),
      );
      const buffer = await libro([
        ENCABEZADO_PROCESOS,
        proceso({ contrato: '4600001', observacion: 'nueva' }),
      ]);

      const { errores } = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        true,
        editor,
      );

      expect(procesosService.verificarScope).toHaveBeenCalledWith('50', editor);
      expect(errores).toHaveLength(1);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('reporta las columnas obligatorias que faltan en el encabezado', async () => {
      const buffer = await libro([
        ['Actividad', 'Estado'],
        ['x', 'y'],
      ]);

      const { errores } = await service.importar(
        TipoImportacion.PROCESOS,
        buffer,
        false,
        admin,
      );

      expect(errores).toEqual([
        { fila: 1, columna: 'Dependencia', mensaje: expect.any(String) },
      ]);
    });

    it('rechaza con 400 un archivo que no es xlsx', async () => {
      await expect(
        service.importar(
          TipoImportacion.PROCESOS,
          Buffer.from('no soy un excel'),
          false,
          admin,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('personal', () => {
    it('crea y actualiza cortes por (tipo, vigencia) en una sola transacción', async () => {
      corteRepo.find.mockResolvedValueOnce([
        { id: '9', tipoPersonalId: 5, vigencia: 2026, actual: 10, meta: 40 },
      ]);
      const buffer = await libro([
        ENCABEZADO_PERSONAL,
        ['Gestores Territoriales', 2026, 12, null, 40, null, null],
        ['Guardas', '2026', 3, 1, 5, '31/12/2026', 'ok'],
      ]);

      const resultado = await service.importar(
        TipoImportacion.PERSONAL,
        buffer,
        true,
        admin,
      );

      expect(resultado).toMatchObject({
        total: 2,
        creados: 1,
        actualizados: 1,
        confirmado: true,
      });
      expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
      expect(manager.update).toHaveBeenCalledWith(PersonalCorte, '9', {
        actual: 12,
      });
      expect(manager.create).toHaveBeenCalledWith(PersonalCorte, {
        tipoPersonalId: 6,
        vigencia: 2026,
        actual: 3,
        pendiente: 1,
        meta: 5,
        fechaFinal: '2026-12-31',
        observaciones: 'ok',
      });
    });

    it('detecta claves repetidas y valores fuera de rango sin escribir', async () => {
      const buffer = await libro([
        ENCABEZADO_PERSONAL,
        ['Guardas', 2026, 3],
        ['guardas', 2026, 4],
        ['Guardas', 2019, 4],
        ['Desconocido', 2026, -1],
      ]);

      const { errores, confirmado } = await service.importar(
        TipoImportacion.PERSONAL,
        buffer,
        true,
        admin,
      );

      expect(errores.map((e) => [e.fila, e.columna])).toEqual([
        [3, undefined],
        [4, 'Vigencia'],
        [5, 'Tipo de personal'],
        [5, 'Actual'],
      ]);
      expect(confirmado).toBe(false);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('verifica el scope del EDITOR una sola vez por tipo de personal', async () => {
      personalService.verificarScope.mockRejectedValue(
        new ForbiddenException(),
      );
      const buffer = await libro([
        ENCABEZADO_PERSONAL,
        ['Guardas', 2025, 3],
        ['Guardas', 2026, 3],
      ]);

      const { errores } = await service.importar(
        TipoImportacion.PERSONAL,
        buffer,
        false,
        editor,
      );

      expect(personalService.verificarScope).toHaveBeenCalledTimes(1);
      expect(errores).toHaveLength(2);
    });
  });

  describe('generarPlantilla', () => {
    it.each([
      [TipoImportacion.PROCESOS, 'Procesos', ENCABEZADO_PROCESOS],
      [TipoImportacion.PERSONAL, 'Personal', ENCABEZADO_PERSONAL],
    ])('%s trae los encabezados esperados', async (tipo, hoja, encabezado) => {
      const buffer = await service.generarPlantilla(tipo);

      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
      const datos = workbook.getWorksheet(hoja)!;
      expect(datos.getRow(1).values as unknown[]).toEqual([
        undefined,
        ...encabezado,
      ]);
      expect(datos.getRow(1).font?.bold).toBe(true);
      expect(workbook.getWorksheet('Instrucciones')).toBeDefined();
    });
  });
});
