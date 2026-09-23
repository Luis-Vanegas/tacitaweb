import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

function crearContexto(headers: Record<string, string>): ExecutionContext {
  const request = { headers, params: {} };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  let jwtService: { verifyAsync: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      reflector as unknown as Reflector,
    );
  });

  it('deja pasar rutas @Public() sin token', async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const ctx = crearContexto({});

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rechaza sin header Authorization', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    const ctx = crearContexto({});

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('rechaza token inválido', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockRejectedValue(new Error('bad token'));
    const ctx = crearContexto({ authorization: 'Bearer feo' });

    await expect(guard.canActivate(ctx)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('acepta token válido y expone el usuario en request', async () => {
    reflector.getAllAndOverride.mockReturnValue(false);
    jwtService.verifyAsync.mockResolvedValue({
      sub: 'u1',
      email: 'a@b.com',
      rol: 'ADMIN',
    });
    const request = { headers: { authorization: 'Bearer ok' }, params: {} };
    const ctx = {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect((request as unknown as { usuario: unknown }).usuario).toEqual({
      id: 'u1',
      email: 'a@b.com',
      rol: 'ADMIN',
    });
  });
});
