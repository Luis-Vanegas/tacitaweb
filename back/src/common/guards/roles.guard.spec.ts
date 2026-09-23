import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { RolUsuario } from '@/database/entities/usuario.entity';

function crearContexto(usuario?: { rol: string }): ExecutionContext {
  const request = { usuario };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('RolesGuard', () => {
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: RolesGuard;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new RolesGuard(reflector as unknown as Reflector);
  });

  it('permite si la ruta no declara @Roles()', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    expect(guard.canActivate(crearContexto())).toBe(true);
  });

  it('rechaza sin usuario en la request', () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.ADMIN]);
    expect(guard.canActivate(crearContexto())).toBe(false);
  });

  it('rechaza si el rol no está permitido', () => {
    reflector.getAllAndOverride.mockReturnValue([RolUsuario.ADMIN]);
    expect(guard.canActivate(crearContexto({ rol: RolUsuario.LECTOR }))).toBe(
      false,
    );
  });

  it('permite si el rol está en la lista', () => {
    reflector.getAllAndOverride.mockReturnValue([
      RolUsuario.ADMIN,
      RolUsuario.EDITOR,
    ]);
    expect(guard.canActivate(crearContexto({ rol: RolUsuario.EDITOR }))).toBe(
      true,
    );
  });
});
