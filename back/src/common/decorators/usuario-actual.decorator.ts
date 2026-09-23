// Extrae el usuario autenticado que JwtAuthGuard dejó en request.usuario.
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id: string;
  email: string;
  rol: string;
}

export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.usuario;
  },
);
