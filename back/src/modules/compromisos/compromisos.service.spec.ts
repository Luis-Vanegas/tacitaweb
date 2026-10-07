import { NotFoundException } from '@nestjs/common';
import { CompromisosService } from './compromisos.service';

describe('CompromisosService', () => {
  let compromisoRepo: { find: jest.Mock; findOne: jest.Mock };
  let manager: {
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    delete: jest.Mock;
  };
  let queryRunner: {
    connect: jest.Mock;
    startTransaction: jest.Mock;
    commitTransaction: jest.Mock;
    rollbackTransaction: jest.Mock;
    release: jest.Mock;
    query: jest.Mock;
    manager: unknown;
  };
  let dataSource: { createQueryRunner: jest.Mock };
  let service: CompromisosService;

  const actor = { id: 'editor-1', email: 'e@e.com', rol: 'EDITOR' } as any;

  beforeEach(() => {
    compromisoRepo = { find: jest.fn(), findOne: jest.fn() };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 7, ...data })),
      update: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(undefined),
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
    service = new CompromisosService(compromisoRepo as any, dataSource as any);
  });

  it('lista con los que vencen primero y sin fecha al final', async () => {
    compromisoRepo.find.mockResolvedValueOnce([]);
    await service.listar();
    expect(compromisoRepo.find).toHaveBeenCalledWith({
      order: {
        fechaCumplimiento: { direction: 'ASC', nulls: 'LAST' },
        id: 'ASC',
      },
    });
  });

  it('crea dentro de una transacción auditada y devuelve la fila guardada', async () => {
    compromisoRepo.findOne.mockResolvedValueOnce({ id: 7, descripcion: 'X' });

    const resultado = await service.crear({ descripcion: 'X' }, actor);

    expect(queryRunner.query).toHaveBeenCalledWith(
      'select set_config($1, $2, true)',
      ['app.usuario_id', 'editor-1'],
    );
    expect(manager.save).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(compromisoRepo.findOne).toHaveBeenCalledWith({ where: { id: 7 } });
    expect(resultado).toEqual({ id: 7, descripcion: 'X' });
  });

  it('actualizar lanza 404 si no existe y no abre transacción', async () => {
    compromisoRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.actualizar(99, { estado: 'CUMPLIDO' }, actor),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(dataSource.createQueryRunner).not.toHaveBeenCalled();
  });

  it('actualizar aplica el cambio auditado', async () => {
    compromisoRepo.findOne
      .mockResolvedValueOnce({ id: 3 })
      .mockResolvedValueOnce({ id: 3, estado: 'CUMPLIDO' });

    const resultado = await service.actualizar(
      3,
      { estado: 'CUMPLIDO' },
      actor,
    );

    expect(manager.update).toHaveBeenCalledWith(expect.anything(), 3, {
      estado: 'CUMPLIDO',
    });
    expect(queryRunner.query).toHaveBeenCalled();
    expect(resultado).toEqual({ id: 3, estado: 'CUMPLIDO' });
  });

  it('eliminar lanza 404 si no existe', async () => {
    compromisoRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.eliminar(99, actor)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(manager.delete).not.toHaveBeenCalled();
  });

  it('eliminar borra dentro de la transacción auditada', async () => {
    compromisoRepo.findOne.mockResolvedValueOnce({ id: 3 });
    await service.eliminar(3, actor);
    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), 3);
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
  });
});
