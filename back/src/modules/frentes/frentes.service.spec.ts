import { NotFoundException } from '@nestjs/common';
import { Workbook } from 'exceljs';
import { FrentesService } from './frentes.service';
import { CriterioFrenteProceso } from '@/database/entities/frente-proceso.entity';

describe('FrentesService', () => {
  let frenteRepo: { findOne: jest.Mock };
  let resumenRepo: { find: jest.Mock; findOne: jest.Mock };
  let procesoDetalleRepo: { find: jest.Mock; createQueryBuilder: jest.Mock };
  let personalVigenteRepo: { find: jest.Mock };
  let frenteProcesoRepo: { find: jest.Mock };
  let frenteTipoPersonalRepo: { find: jest.Mock };
  let personalCorteRepo: { find: jest.Mock };
  let personalOperadorRepo: { find: jest.Mock };
  let procesoRepo: { findOne: jest.Mock };
  let manager: {
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
  };
  let dataSource: { createQueryRunner: jest.Mock };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    query: jest.Mock;
    manager: unknown;
  };
  let service: FrentesService;

  beforeEach(() => {
    frenteRepo = { findOne: jest.fn() };
    resumenRepo = { find: jest.fn(), findOne: jest.fn() };
    procesoDetalleRepo = { find: jest.fn(), createQueryBuilder: jest.fn() };
    personalVigenteRepo = { find: jest.fn() };
    frenteProcesoRepo = { find: jest.fn() };
    frenteTipoPersonalRepo = { find: jest.fn() };
    personalCorteRepo = { find: jest.fn() };
    personalOperadorRepo = { find: jest.fn() };
    procesoRepo = { findOne: jest.fn() };
    manager = {
      findOne: jest.fn(),
      save: jest.fn().mockResolvedValue(undefined),
      create: jest.fn((_entity, data) => data),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    queryRunner = {
      connect: jest.fn().mockResolvedValue(undefined),
      startTransaction: jest.fn().mockResolvedValue(undefined),
      commitTransaction: jest.fn().mockResolvedValue(undefined),
      rollbackTransaction: jest.fn().mockResolvedValue(undefined),
      release: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
      manager,
    };
    dataSource = { createQueryRunner: jest.fn().mockReturnValue(queryRunner) };

    service = new FrentesService(
      frenteRepo as any,
      resumenRepo as any,
      procesoDetalleRepo as any,
      personalVigenteRepo as any,
      frenteProcesoRepo as any,
      frenteTipoPersonalRepo as any,
      personalCorteRepo as any,
      personalOperadorRepo as any,
      procesoRepo as any,
      dataSource as any,
    );
  });

  describe('obtenerDetalle', () => {
    it('lanza 404 si el frente no existe', async () => {
      frenteRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.obtenerDetalle('no-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('agrupa el conteo por estado y las dependencias involucradas', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      resumenRepo.findOne.mockResolvedValueOnce({
        id: 1,
        slug: 'sif',
        nombre: 'SIF',
      });
      frenteProcesoRepo.find.mockResolvedValueOnce([
        { procesoId: '10' },
        { procesoId: '11' },
      ]);
      procesoDetalleRepo.find.mockResolvedValueOnce([
        {
          id: '10',
          estadoId: 1,
          estado: 'En ejecución',
          estadoColor: '#00ABEE',
          dependenciaId: 5,
          dependencia: 'Infraestructura',
        },
        {
          id: '11',
          estadoId: 1,
          estado: 'En ejecución',
          estadoColor: '#00ABEE',
          dependenciaId: 5,
          dependencia: 'Infraestructura',
        },
      ]);

      const resultado = await service.obtenerDetalle('sif');

      expect(resultado.conteoPorEstado).toEqual([
        { estadoId: 1, estado: 'En ejecución', color: '#00ABEE', total: 2 },
      ]);
      expect(resultado.dependenciasInvolucradas).toEqual([
        { id: 5, nombre: 'Infraestructura' },
      ]);
    });
  });

  describe('vincularProceso', () => {
    it('lanza 404 si el proceso no existe', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      procesoRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.vincularProceso('sif', '99', {}, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('crea el vínculo con criterio MANUAL cuando no existe', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      procesoRepo.findOne.mockResolvedValueOnce({ id: '10' });
      manager.findOne.mockResolvedValueOnce(null);

      await service.vincularProceso('sif', '10', { nota: 'a mano' }, 'admin-1');

      expect(manager.create).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          frenteId: 1,
          procesoId: '10',
          criterio: CriterioFrenteProceso.MANUAL,
          nota: 'a mano',
        }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('desvincularProceso', () => {
    it('lanza 404 si no había vínculo para borrar', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      manager.delete.mockResolvedValueOnce({ affected: 0 });

      await expect(
        service.desvincularProceso('sif', '10', 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('exportarExcel', () => {
    const construirQueryBuilder = (procesos: unknown[]) => ({
      innerJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(procesos),
    });

    it('lanza 404 si el frente no existe', async () => {
      frenteRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.exportarExcel('no-existe')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('arma el Excel con las hojas Procesos y Personal y sus columnas', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      procesoDetalleRepo.createQueryBuilder.mockReturnValueOnce(
        construirQueryBuilder([
          {
            actividad: 'Poda de árboles',
            contratista: 'Contratista S.A.S.',
            tipo: 'CONTRATO',
            numeroContrato: '4600108890',
            numeroNecesidad: '56173',
            estado: 'En ejecución',
            fase: 'EJECUCION',
            fechaInicio: '2025-01-10',
            fechaTerminacion: '2025-12-31',
            diasRestantes: 45,
            pctPlazo: 60,
            linkSecop: 'https://secop.gov.co/1',
          },
        ]),
      );
      frenteTipoPersonalRepo.find.mockResolvedValueOnce([
        { frenteId: 1, tipoPersonalId: 7 },
      ]);
      personalVigenteRepo.find.mockResolvedValueOnce([
        {
          tipoPersonalId: 7,
          tipoPersonal: 'Operarios de aseo',
          vigencia: 2026,
          actual: 30,
          pendiente: 5,
          meta: 35,
          fechaFinal: '2026-12-31',
        },
      ]);

      const buffer = await service.exportarExcel('sif');
      expect(Buffer.isBuffer(buffer)).toBe(true);

      const workbook = new Workbook();
      // exceljs tipa load() con su propio `Buffer` (alias local de
      // ArrayBuffer), incompatible en TS con el Buffer real de Node que
      // devuelve writeBuffer() en runtime — cast necesario, es un problema
      // conocido de sus tipos, no del código.
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

      const hojaProcesos = workbook.getWorksheet('Procesos');
      expect(hojaProcesos).toBeDefined();
      expect(hojaProcesos!.getRow(1).values as unknown[]).toEqual([
        undefined,
        'Actividad',
        'Contratista',
        'Tipo',
        'N.º contrato',
        'N.º necesidad',
        'Estado',
        'Fase',
        'Fecha inicio',
        'Fecha terminación',
        'Días restantes',
        '% plazo',
        'Link SECOP',
      ]);
      expect(hojaProcesos!.getRow(2).getCell(1).value).toBe('Poda de árboles');
      expect(hojaProcesos!.getRow(2).getCell(4).value).toBe('4600108890');
      expect(hojaProcesos!.getRow(2).getCell(11).value).toBe(60);

      const hojaPersonal = workbook.getWorksheet('Personal');
      expect(hojaPersonal).toBeDefined();
      expect(hojaPersonal!.getRow(1).values as unknown[]).toEqual([
        undefined,
        'Tipo de personal',
        'Vigencia',
        'Actual',
        'Pendiente',
        'Meta',
        'Fecha final',
      ]);
      expect(hojaPersonal!.getRow(2).getCell(1).value).toBe(
        'Operarios de aseo',
      );
      expect(hojaPersonal!.getRow(2).getCell(3).value).toBe(30);
    });

    it('deja la hoja Personal solo con encabezado si el frente no tiene tipos vinculados', async () => {
      frenteRepo.findOne.mockResolvedValueOnce({ id: 1, slug: 'sif' });
      procesoDetalleRepo.createQueryBuilder.mockReturnValueOnce(
        construirQueryBuilder([]),
      );
      frenteTipoPersonalRepo.find.mockResolvedValueOnce([]);

      const buffer = await service.exportarExcel('sif');
      const workbook = new Workbook();
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

      expect(personalVigenteRepo.find).not.toHaveBeenCalled();
      expect(workbook.getWorksheet('Personal')!.rowCount).toBe(1);
    });
  });
});
