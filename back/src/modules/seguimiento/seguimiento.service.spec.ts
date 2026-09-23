import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SeguimientoService } from './seguimiento.service';
import { RolUsuario } from '@/database/entities/usuario.entity';

describe('SeguimientoService', () => {
  let seguimientoRepo: { find: jest.Mock };
  let procesoRepo: { exist: jest.Mock };
  let frenteProcesoRepo: { find: jest.Mock };
  let usuarioFrenteRepo: { exist: jest.Mock };
  let manager: { create: jest.Mock; save: jest.Mock };
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
  let service: SeguimientoService;

  const admin = { id: 'admin-1', email: 'a@a.com', rol: RolUsuario.ADMIN };
  const editor = { id: 'editor-1', email: 'e@e.com', rol: RolUsuario.EDITOR };

  beforeEach(() => {
    seguimientoRepo = { find: jest.fn().mockResolvedValue([]) };
    procesoRepo = { exist: jest.fn().mockResolvedValue(true) };
    frenteProcesoRepo = { find: jest.fn().mockResolvedValue([]) };
    usuarioFrenteRepo = { exist: jest.fn() };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue({ id: '1' }),
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

    service = new SeguimientoService(
      seguimientoRepo as any,
      procesoRepo as any,
      frenteProcesoRepo as any,
      usuarioFrenteRepo as any,
      dataSource as any,
    );
  });

  it('listar lanza 404 si el proceso no existe', async () => {
    procesoRepo.exist.mockResolvedValueOnce(false);
    await expect(service.listar('99')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('ADMIN crea la nota sin consultar usuario_frente', async () => {
    await service.crear('10', { nota: 'nota' }, admin);
    expect(usuarioFrenteRepo.exist).not.toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });

  it('EDITOR sin el frente del proceso recibe 403', async () => {
    frenteProcesoRepo.find.mockResolvedValueOnce([{ frenteId: 2 }]);
    usuarioFrenteRepo.exist.mockResolvedValueOnce(false);

    await expect(
      service.crear('10', { nota: 'nota' }, editor),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('EDITOR con el frente del proceso crea la nota', async () => {
    frenteProcesoRepo.find.mockResolvedValueOnce([{ frenteId: 2 }]);
    usuarioFrenteRepo.exist.mockResolvedValueOnce(true);

    await service.crear('10', { nota: 'nota' }, editor);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });
});
