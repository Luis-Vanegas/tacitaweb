import { NotFoundException } from '@nestjs/common';
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
});
