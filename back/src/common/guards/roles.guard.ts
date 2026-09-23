// Lee @Roles(...) y compara contra el rol del usuario autenticado (que dejó
// JwtAuthGuard en request.usuario). Todavía no está enganchado a ningún
// controller real: no hay módulos de negocio en esta fase.
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { UsuarioAutenticado } from '../decorators/usuario-actual.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rolesRequeridos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!rolesRequeridos || rolesRequeridos.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const usuario = request.usuario;
    if (!usuario) {
      return false;
    }

    return rolesRequeridos.includes(usuario.rol as RolUsuario);
  }
}
