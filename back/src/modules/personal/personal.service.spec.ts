import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PersonalService } from './personal.service';
import { RolUsuario } from '@/database/entities/usuario.entity';

describe('PersonalService', () => {
  let corteRepo: { findOne: jest.Mock; find: jest.Mock };
  let vigenteRepo: { find: jest.Mock };
  let frenteTipoPersonalRepo: { find: jest.Mock };
  let usuarioFrenteRepo: { exist: jest.Mock };
  let manager: { create: jest.Mock; save: jest.Mock; update: jest.Mock };
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
  let service: PersonalService;

  const admin = { id: 'admin-1', email: 'a@a.com', rol: RolUsuario.ADMIN };
  const editor = { id: 'editor-1', email: 'e@e.com', rol: RolUsuario.EDITOR };

  beforeEach(() => {
    corteRepo = { findOne: jest.fn(), find: jest.fn().mockResolvedValue([]) };
    vigenteRepo = { find: jest.fn().mockResolvedValue([]) };
    frenteTipoPersonalRepo = { find: jest.fn().mockResolvedValue([]) };
    usuarioFrenteRepo = { exist: jest.fn() };
    manager = {
      create: jest.fn((_entity, data) => data),
      save: jest.fn().mockResolvedValue({ id: '5' }),
      update: jest.fn().mockResolvedValue(undefined),
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

    service = new PersonalService(
      corteRepo as any,
      frenteTipoPersonalRepo as any,
      usuarioFrenteRepo as any,
      dataSource as any,
      vigenteRepo as any,
    );
  });

  describe('actualizarCorte', () => {
    it('lanza 404 si el corte no existe', async () => {
      corteRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.actualizarCorte('99', { actual: 10 }, admin),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('EDITOR sin el frente del tipo de personal recibe 403', async () => {
      corteRepo.findOne.mockResolvedValueOnce({ id: '5', tipoPersonalId: 2 });
      frenteTipoPersonalRepo.find.mockResolvedValueOnce([{ frenteId: 9 }]);
      usuarioFrenteRepo.exist.mockResolvedValueOnce(false);

      await expect(
        service.actualizarCorte('5', { actual: 10 }, editor),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('ADMIN actualiza sin consultar usuario_frente', async () => {
      corteRepo.findOne
        .mockResolvedValueOnce({ id: '5', tipoPersonalId: 2 })
        .mockResolvedValueOnce({ id: '5', actual: 10 });

      const resultado = await service.actualizarCorte(
        '5',
        { actual: 10 },
        admin,
      );

      expect(usuarioFrenteRepo.exist).not.toHaveBeenCalled();
      expect(manager.update).toHaveBeenCalledWith(expect.anything(), '5', {
        actual: 10,
      });
      expect(resultado).toEqual({ id: '5', actual: 10 });
    });
  });

  describe('crearCorte', () => {
    it('crea una nueva vigencia dentro de una transacción auditada', async () => {
      corteRepo.findOne.mockResolvedValueOnce({ id: '5', vigencia: 2026 });

      await service.crearCorte(
        { tipoPersonalId: 2, vigencia: 2026, actual: 10 },
        admin,
      );

      expect(queryRunner.query).toHaveBeenCalledWith(
        'select set_config($1, $2, true)',
        ['app.usuario_id', 'admin-1'],
      );
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('listarGeneral', () => {
    const frenteA = { slug: 'a', nombre: 'A', color: '#111', activo: true };
    const frenteB = { slug: 'b', nombre: 'B', color: '#222', activo: true };
    const frenteInactivo = {
      slug: 'x',
      nombre: 'X',
      color: '#333',
      activo: false,
    };

    it('un tipo ligado a dos frentes aparece una vez y los totales no cuentan doble', async () => {
      vigenteRepo.find.mockResolvedValueOnce([
        { corteId: '1', tipoPersonalId: 10, actual: 5, pendiente: 3, meta: 8 },
        {
          corteId: '2',
          tipoPersonalId: 20,
          actual: 4,
          pendiente: null,
          meta: null,
        },
      ]);
      frenteTipoPersonalRepo.find.mockResolvedValueOnce([
        { tipoPersonalId: 10, frente: frenteA },
        { tipoPersonalId: 10, frente: frenteB },
        { tipoPersonalId: 20, frente: frenteInactivo },
      ]);
      corteRepo.find.mockResolvedValueOnce([{ id: '1' }, { id: '2' }]);

      const resultado = await service.listarGeneral();

      expect(resultado.items).toHaveLength(2);
      expect(resultado.items[0].frentes).toEqual([
        { slug: 'a', nombre: 'A', color: '#111' },
        { slug: 'b', nombre: 'B', color: '#222' },
      ]);
      // Frentes inactivos se ocultan igual que en v_resumen_frente.
      expect(resultado.items[1].frentes).toEqual([]);
      expect(resultado.totales).toEqual({ actual: 9, pendiente: 3, meta: 8 });
      expect(resultado.historico).toEqual([{ id: '1' }, { id: '2' }]);
    });

    it('un pendiente negativo suma 0 (greatest(pendiente, 0))', async () => {
      vigenteRepo.find.mockResolvedValueOnce([
        {
          corteId: '1',
          tipoPersonalId: 10,
          actual: 12,
          pendiente: -2,
          meta: 10,
        },
        { corteId: '2', tipoPersonalId: 20, actual: 1, pendiente: 4, meta: 5 },
      ]);

      const resultado = await service.listarGeneral();

      expect(resultado.totales).toEqual({ actual: 13, pendiente: 4, meta: 15 });
      // El �tem conserva el valor de la vista; solo el total se recorta.
      expect(resultado.items[0].pendiente).toBe(-2);
    });
  });
});
