import { NotFoundException } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { RolUsuario } from '@/database/entities/usuario.entity';

describe('UsuariosService', () => {
  let usuarioRepo: { find: jest.Mock; findOne: jest.Mock };
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
  let service: UsuariosService;

  const usuarioGuardado = {
    id: 'u1',
    email: 'nuevo@tacita.gov.co',
    nombre: 'Nuevo',
    rol: RolUsuario.EDITOR,
    activo: true,
    ultimoAcceso: null,
    frentes: [],
  };

  beforeEach(() => {
    usuarioRepo = { find: jest.fn(), findOne: jest.fn() };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue({ id: 'u1' }),
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

    service = new UsuariosService(usuarioRepo as any, dataSource as any);
  });

  it('lanza 404 al obtener un usuario inexistente', async () => {
    usuarioRepo.findOne.mockResolvedValueOnce(null);
    await expect(service.obtener('no-existe')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('crea el usuario dentro de una transacción auditada y nunca expone el hash', async () => {
    usuarioRepo.findOne.mockResolvedValue(usuarioGuardado);

    const resultado = await service.crear(
      {
        email: 'Nuevo@Tacita.gov.co',
        nombre: 'Nuevo',
        password: 'contraseña-larga',
        rol: RolUsuario.EDITOR,
        frentes: [1, 2],
      },
      'admin-1',
    );

    expect(queryRunner.query).toHaveBeenCalledWith(
      'select set_config($1, $2, true)',
      ['app.usuario_id', 'admin-1'],
    );
    expect(queryRunner.commitTransaction).toHaveBeenCalled();
    expect(manager.create).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ email: 'nuevo@tacita.gov.co' }),
    );
    expect(resultado).not.toHaveProperty('passwordHash');
    expect(resultado.id).toBe('u1');
  });

  it('hace rollback si algo falla durante la creación', async () => {
    usuarioRepo.findOne.mockResolvedValue(usuarioGuardado);
    manager.save.mockRejectedValueOnce(new Error('boom'));

    await expect(
      service.crear(
        {
          email: 'x@x.com',
          nombre: 'X',
          password: '12345678',
          rol: RolUsuario.LECTOR,
        },
        'admin-1',
      ),
    ).rejects.toThrow('boom');

    expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
    expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
  });

  it('actualizar reemplaza los vínculos de frente cuando se envían', async () => {
    usuarioRepo.findOne
      .mockResolvedValueOnce(usuarioGuardado) // buscarOFallar
      .mockResolvedValueOnce(usuarioGuardado); // obtener() final

    await service.actualizar('u1', { frentes: [3] }, 'admin-1');

    expect(manager.delete).toHaveBeenCalledWith(expect.anything(), {
      usuarioId: 'u1',
    });
    expect(manager.save).toHaveBeenCalled();
  });

  it('eliminar lanza 404 si el usuario no existe', async () => {
    usuarioRepo.findOne.mockResolvedValueOnce(null);
    await expect(
      service.eliminar('no-existe', 'admin-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
