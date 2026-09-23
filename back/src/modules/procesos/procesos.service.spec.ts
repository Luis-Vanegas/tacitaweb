import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProcesosService } from './procesos.service';
import { RolUsuario } from '@/database/entities/usuario.entity';

describe('ProcesosService', () => {
  let procesoRepo: { findOne: jest.Mock; find: jest.Mock };
  let seguimientoRepo: { find: jest.Mock };
  let frenteProcesoRepo: { find: jest.Mock };
  let usuarioFrenteRepo: { exist: jest.Mock };
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
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
  let service: ProcesosService;

  const admin = { id: 'admin-1', email: 'a@a.com', rol: RolUsuario.ADMIN };
  const editor = { id: 'editor-1', email: 'e@e.com', rol: RolUsuario.EDITOR };

  beforeEach(() => {
    procesoRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    seguimientoRepo = { find: jest.fn().mockResolvedValue([]) };
    frenteProcesoRepo = { find: jest.fn().mockResolvedValue([]) };
    usuarioFrenteRepo = { exist: jest.fn() };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue({ id: '10' }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
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

    service = new ProcesosService(
      procesoRepo as any,
      seguimientoRepo as any,
      frenteProcesoRepo as any,
      usuarioFrenteRepo as any,
      dataSource as any,
    );
  });

  describe('obtenerDetalle', () => {
    it('lanza 404 si no existe', async () => {
      procesoRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.obtenerDetalle('99')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('cambiarEstado', () => {
    it('actualiza el estado y crea la nota de seguimiento en la misma transacción', async () => {
      procesoRepo.findOne.mockResolvedValue({ id: '10' });

      await service.cambiarEstado(
        '10',
        { estadoId: 3, nota: 'Pasa a ejecución' },
        admin,
      );

      expect(manager.update).toHaveBeenCalledWith(
        expect.anything(),
        '10',
        expect.objectContaining({ estadoId: 3 }),
      );
      expect(manager.save).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          procesoId: '10',
          nota: 'Pasa a ejecución',
          estadoId: 3,
        }),
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('hace rollback (estado y nota) si el proceso no existe', async () => {
      manager.update.mockResolvedValueOnce({ affected: 0 });

      await expect(
        service.cambiarEstado('99', { estadoId: 3, nota: 'x' }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });

    it('EDITOR sin el frente del proceso recibe 403 y no llega a abrir transacción', async () => {
      frenteProcesoRepo.find.mockResolvedValueOnce([{ frenteId: 7 }]);
      usuarioFrenteRepo.exist.mockResolvedValueOnce(false);

      await expect(
        service.cambiarEstado('10', { estadoId: 3, nota: 'x' }, editor),
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
    });

    it('EDITOR con el frente del proceso puede cambiar el estado', async () => {
      procesoRepo.findOne.mockResolvedValue({ id: '10' });
      frenteProcesoRepo.find.mockResolvedValueOnce([{ frenteId: 7 }]);
      usuarioFrenteRepo.exist.mockResolvedValueOnce(true);

      await service.cambiarEstado('10', { estadoId: 3, nota: 'x' }, editor);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('eliminar', () => {
    it('lanza 404 si no había nada que borrar', async () => {
      manager.delete.mockResolvedValueOnce({ affected: 0 });
      await expect(service.eliminar('99', 'admin-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
