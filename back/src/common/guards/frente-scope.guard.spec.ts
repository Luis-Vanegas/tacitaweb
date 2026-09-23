import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { FrenteScopeGuard } from './frente-scope.guard';
import { Frente } from '@/database/entities/frente.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';

function crearContexto(usuario: unknown, params: Record<string, string>) {
  const request = { usuario, params };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('FrenteScopeGuard', () => {
  let frenteRepo: { findOne: jest.Mock };
  let usuarioFrenteRepo: { exist: jest.Mock };
  let guard: FrenteScopeGuard;

  beforeEach(() => {
    frenteRepo = { findOne: jest.fn() };
    usuarioFrenteRepo = { exist: jest.fn() };
    guard = new FrenteScopeGuard(
      frenteRepo as unknown as Repository<Frente>,
      usuarioFrenteRepo as unknown as Repository<UsuarioFrente>,
    );
  });

  it('rechaza sin usuario en la request', async () => {
    await expect(guard.canActivate(crearContexto(undefined, {}))).resolves.toBe(
      false,
    );
  });

  it('ADMIN entra sin consultar usuario_frente', async () => {
    const ctx = crearContexto({ id: 'u1', rol: RolUsuario.ADMIN }, {});
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usuarioFrenteRepo.exist).not.toHaveBeenCalled();
  });

  it('LECTOR queda afuera', async () => {
    const ctx = crearContexto({ id: 'u1', rol: RolUsuario.LECTOR }, {});
    await expect(guard.canActivate(ctx)).resolves.toBe(false);
  });

  it('EDITOR sin el frente asignado recibe 403', async () => {
    usuarioFrenteRepo.exist.mockResolvedValue(false);
    const ctx = crearContexto(
      { id: 'u1', rol: RolUsuario.EDITOR },
      { frenteId: '3' },
    );
    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('EDITOR con el frente asignado (resuelto por slug) entra', async () => {
    frenteRepo.findOne.mockResolvedValue({ id: 4 });
    usuarioFrenteRepo.exist.mockResolvedValue(true);
    const ctx = crearContexto(
      { id: 'u1', rol: RolUsuario.EDITOR },
      { slug: 'sif' },
    );

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(usuarioFrenteRepo.exist).toHaveBeenCalledWith({
      where: { usuarioId: 'u1', frenteId: 4 },
    });
  });
});
