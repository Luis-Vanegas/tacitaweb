// Verificación de scope de frente para endpoints cuyo recurso se identifica
// por su propio :id (proceso, corte de personal) y no por :slug/:frenteId.
// FrenteScopeGuard (common/guards/frente-scope.guard.ts) ya cubre las rutas
// donde el frente está directamente en la URL; para las demás, cada servicio
// resuelve primero a qué frente(s) pertenece el recurso (vía frente_proceso o
// frente_tipo_personal) y delega acá la misma regla: ADMIN pasa siempre,
// EDITOR necesita al menos uno de esos frentes en core.usuario_frente.
import { ForbiddenException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { UsuarioAutenticado } from '../decorators/usuario-actual.decorator';

export async function asegurarScopeFrente(
  usuarioFrenteRepository: Repository<UsuarioFrente>,
  usuario: UsuarioAutenticado,
  frenteIds: number[],
): Promise<void> {
  if (usuario.rol === RolUsuario.ADMIN) {
    return;
  }
  if (usuario.rol !== RolUsuario.EDITOR || frenteIds.length === 0) {
    throw new ForbiddenException('No tenés acceso a este recurso');
  }

  const tieneAcceso = await usuarioFrenteRepository.exist({
    where: frenteIds.map((frenteId) => ({ usuarioId: usuario.id, frenteId })),
  });
  if (!tieneAcceso) {
    throw new ForbiddenException('No tenés asignado el frente de este recurso');
  }
}
