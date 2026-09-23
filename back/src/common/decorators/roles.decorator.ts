// Declara qué roles (ver core.usuario.rol) pueden entrar a una ruta.
// Lo lee RolesGuard, que aún no está enganchado a ningún controller real
// (no hay módulos de negocio en esta fase).
import { SetMetadata } from '@nestjs/common';
import { RolUsuario } from '@/database/entities/usuario.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: RolUsuario[]) => SetMetadata(ROLES_KEY, roles);
