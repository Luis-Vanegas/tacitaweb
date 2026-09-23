// ADMIN entra a cualquier frente. EDITOR solo a los frentes que tenga
// asignados en core.usuario_frente (LECTOR nunca debería llegar acá: las
// rutas que usan este guard van detrás de @Roles(ADMIN, EDITOR)).
// Resuelve el frente de la ruta por :frenteId (numérico) o por :slug.
// Todavía no está enganchado a ningún controller real (no hay módulos de
// negocio en esta fase): solo compila y tiene sus tests unitarios.
import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Frente } from '@/database/entities/frente.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { UsuarioAutenticado } from '../decorators/usuario-actual.decorator';

@Injectable()
export class FrenteScopeGuard implements CanActivate {
  constructor(
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { usuario?: UsuarioAutenticado }>();
    const usuario = request.usuario;
    if (!usuario) {
      return false;
    }
    if (usuario.rol === RolUsuario.ADMIN) {
      return true;
    }
    if (usuario.rol !== RolUsuario.EDITOR) {
      return false;
    }

    const frenteId = await this.resolverFrenteId(request);
    if (frenteId === undefined) {
      // Sin frente en la ruta no hay nada que scopear.
      return true;
    }

    const tieneAcceso = await this.usuarioFrenteRepository.exist({
      where: { usuarioId: usuario.id, frenteId },
    });
    if (!tieneAcceso) {
      throw new ForbiddenException('No tenés asignado este frente');
    }
    return true;
  }

  private async resolverFrenteId(
    request: Request,
  ): Promise<number | undefined> {
    const { frenteId, slug } = request.params;
    if (typeof frenteId === 'string') {
      return Number(frenteId);
    }
    if (typeof slug === 'string') {
      const frente = await this.frenteRepository.findOne({ where: { slug } });
      return frente?.id;
    }
    return undefined;
  }
}
