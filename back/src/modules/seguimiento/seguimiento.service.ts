import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  OrigenSeguimiento,
  Seguimiento,
} from '@/database/entities/seguimiento.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { FrenteProceso } from '@/database/entities/frente-proceso.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { asegurarScopeFrente } from '@/common/database/frente-scope.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { CrearSeguimientoDto } from './dto/crear-seguimiento.dto';

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class SeguimientoService {
  constructor(
    @InjectRepository(Seguimiento)
    private readonly seguimientoRepository: Repository<Seguimiento>,
    @InjectRepository(ProcesoContratacion)
    private readonly procesoRepository: Repository<ProcesoContratacion>,
    @InjectRepository(FrenteProceso)
    private readonly frenteProcesoRepository: Repository<FrenteProceso>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(procesoId: string): Promise<Seguimiento[]> {
    await this.asegurarProcesoExiste(procesoId);
    return this.seguimientoRepository.find({
      where: { procesoId },
      order: { fecha: 'DESC', id: 'DESC' },
      relations: ['autor', 'estado'],
    });
  }

  async crear(
    procesoId: string,
    dto: CrearSeguimientoDto,
    actor: UsuarioAutenticado,
  ): Promise<Seguimiento> {
    await this.asegurarProcesoExiste(procesoId);

    if (actor.rol !== RolUsuario.ADMIN) {
      const vinculos = await this.frenteProcesoRepository.find({
        where: { procesoId },
      });
      await asegurarScopeFrente(
        this.usuarioFrenteRepository,
        actor,
        vinculos.map((v) => v.frenteId),
      );
    }

    return ejecutarConAuditoria(this.dataSource, actor.id, (manager) =>
      manager.save(
        Seguimiento,
        manager.create(Seguimiento, {
          procesoId,
          fecha: dto.fecha ?? hoyIso(),
          nota: dto.nota,
          estadoId: dto.estadoId ?? null,
          autorId: actor.id,
          origen: OrigenSeguimiento.APP,
        }),
      ),
    );
  }

  private async asegurarProcesoExiste(procesoId: string): Promise<void> {
    const existe = await this.procesoRepository.exist({
      where: { id: procesoId },
    });
    if (!existe) {
      throw new NotFoundException('Proceso no encontrado');
    }
  }
}
