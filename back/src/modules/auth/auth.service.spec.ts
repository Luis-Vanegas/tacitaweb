import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { RolUsuario } from '@/database/entities/usuario.entity';

describe('AuthService', () => {
  let usuarioRepo: {
    createQueryBuilder: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
  };
  let usuarioFrenteRepo: { find: jest.Mock };
  let jwtService: { sign: jest.Mock; verifyAsync: jest.Mock };
  let configService: { get: jest.Mock };
  let service: AuthService;

  const usuarioBase = {
    id: 'u1',
    email: 'admin@tacita.gov.co',
    nombre: 'Admin',
    passwordHash: 'hash',
    rol: RolUsuario.ADMIN,
    activo: true,
  };

  beforeEach(() => {
    usuarioRepo = {
      createQueryBuilder: jest.fn(),
      update: jest.fn().mockResolvedValue(undefined),
      findOne: jest.fn(),
    };
    usuarioFrenteRepo = { find: jest.fn().mockResolvedValue([]) };
    jwtService = {
      sign: jest.fn().mockReturnValue('token-firmado'),
      verifyAsync: jest.fn(),
    };
    configService = { get: jest.fn().mockReturnValue('refresh-secret') };

    service = new AuthService(
      usuarioRepo as any,
      usuarioFrenteRepo as any,
      jwtService as any,
      configService as any,
    );
  });

  function mockQueryBuilder(usuario: unknown) {
    const qb = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(usuario),
    };
    usuarioRepo.createQueryBuilder.mockReturnValue(qb);
    return qb;
  }

  describe('login', () => {
    it('rechaza si el usuario no existe', async () => {
      mockQueryBuilder(null);
      await expect(
        service.login({ email: 'x@x.com', password: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza si el usuario está inactivo', async () => {
      mockQueryBuilder({ ...usuarioBase, activo: false });
      await expect(
        service.login({ email: usuarioBase.email, password: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza con password incorrecto', async () => {
      mockQueryBuilder(usuarioBase);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(false as never);
      await expect(
        service.login({ email: usuarioBase.email, password: 'mal' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('emite access y refresh token con password correcto', async () => {
      mockQueryBuilder(usuarioBase);
      jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);

      const resultado = await service.login({
        email: usuarioBase.email,
        password: 'bien',
      });

      expect(resultado.accessToken).toBe('token-firmado');
      expect(resultado.refreshToken).toBe('token-firmado');
      expect(resultado.usuario.id).toBe('u1');
      expect(usuarioRepo.update).toHaveBeenCalledWith(
        'u1',
        expect.objectContaining({ ultimoAcceso: expect.any(Date) }),
      );
      // El refresh token se firma con el secret dedicado, no el global.
      expect(jwtService.sign).toHaveBeenLastCalledWith(
        expect.objectContaining({ sub: 'u1' }),
        expect.objectContaining({ secret: 'refresh-secret', expiresIn: '7d' }),
      );
    });
  });

  describe('refrescar', () => {
    it('rechaza un refresh token inválido', async () => {
      jwtService.verifyAsync.mockRejectedValueOnce(new Error('inválido'));
      await expect(service.refrescar('token-malo')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rechaza si el usuario ya no existe o está inactivo', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'u1' });
      usuarioRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.refrescar('token')).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });

    it('rota los tokens si todo es válido', async () => {
      jwtService.verifyAsync.mockResolvedValueOnce({ sub: 'u1' });
      usuarioRepo.findOne.mockResolvedValueOnce(usuarioBase);

      const resultado = await service.refrescar('token-viejo');
      expect(resultado.accessToken).toBe('token-firmado');
      expect(resultado.usuario.email).toBe(usuarioBase.email);
    });
  });

  describe('me', () => {
    it('lanza 404 si el usuario no existe', async () => {
      usuarioRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.me('inexistente')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('devuelve el usuario con sus frentes asignados', async () => {
      usuarioRepo.findOne.mockResolvedValueOnce(usuarioBase);
      usuarioFrenteRepo.find.mockResolvedValueOnce([
        { frente: { id: 1, nombre: 'SIF', slug: 'sif' } },
      ]);

      const resultado = await service.me('u1');
      expect(resultado.frentes).toEqual([
        { id: 1, nombre: 'SIF', slug: 'sif' },
      ]);
      expect(resultado).not.toHaveProperty('passwordHash');
    });
  });
});
