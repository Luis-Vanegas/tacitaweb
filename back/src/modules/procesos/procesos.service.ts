import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  ProcesoContratacion,
  TipoProceso,
} from '@/database/entities/proceso-contratacion.entity';
import { VProcesoDetalle } from '@/database/entities/views/proceso-detalle.view-entity';
import {
  CriterioFrenteProceso,
  FrenteProceso,
} from '@/database/entities/frente-proceso.entity';
import {
  OrigenSeguimiento,
  Seguimiento,
} from '@/database/entities/seguimiento.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { asegurarScopeFrente } from '@/common/database/frente-scope.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { CrearProcesoDto } from './dto/crear-proceso.dto';
import { ActualizarProcesoDto } from './dto/actualizar-proceso.dto';
import { CambiarEstadoProcesoDto } from './dto/cambiar-estado-proceso.dto';

function hoyIso(): string {
  return new Date().toISOString().slice(0, 10);
}

@Injectable()
export class ProcesosService {
  constructor(
    @InjectRepository(ProcesoContratacion)
    private readonly procesoRepository: Repository<ProcesoContratacion>,
    @InjectRepository(VProcesoDetalle)
    private readonly vistaProcesoRepository: Repository<VProcesoDetalle>,
    @InjectRepository(Seguimiento)
    private readonly seguimientoRepository: Repository<Seguimiento>,
    @InjectRepository(FrenteProceso)
    private readonly frenteProcesoRepository: Repository<FrenteProceso>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
    private readonly dataSource: DataSource,
  ) {}

  // Usa v_proceso_detalle (como el listado de frentes.service.ts) en vez de
  // reconstruir el detalle a mano con relations: la vista ya trae los campos
  // planos que espera el front (estadoColor, dependencia, proyecto...) y los
  // derivados (diasRestantes, pctPlazo, ultimaNota) que la entidad tabla no tiene.
  async obtenerDetalle(id: string) {
    const proceso = await this.vistaProcesoRepository.findOne({
      where: { id },
    });
    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    const [bitacora, interventorias, frentes] = await Promise.all([
      this.seguimientoRepository.find({
        where: { procesoId: id },
        order: { fecha: 'DESC', id: 'DESC' },
        relations: ['autor', 'estado'],
      }),
      this.vistaProcesoRepository.find({ where: { procesoSupervisadoId: id } }),
      this.frenteProcesoRepository.find({
        where: { procesoId: id },
        relations: ['frente'],
      }),
    ]);

    return {
      ...proceso,
      bitacora,
      interventorias,
      frentes: frentes.map((fp) => ({
        id: fp.frente.id,
        nombre: fp.frente.nombre,
        slug: fp.frente.slug,
        criterio: fp.criterio,
      })),
    };
  }

  async crear(dto: CrearProcesoDto, actorId: string) {
    const id = await ejecutarConAuditoria(
      this.dataSource,
      actorId,
      async (manager) => {
        const proceso = manager.create(ProcesoContratacion, {
          actividadId: dto.actividadId,
          estadoId: dto.estadoId,
          contratistaId: dto.contratistaId ?? null,
          tipo: dto.tipo ?? TipoProceso.PRINCIPAL,
          procesoSupervisadoId: dto.procesoSupervisadoId ?? null,
          numeroContrato: dto.numeroContrato ?? null,
          numeroNecesidad: dto.numeroNecesidad ?? null,
          fechaInicio: dto.fechaInicio ?? null,
          fechaTerminacion: dto.fechaTerminacion ?? null,
          linkSecop: dto.linkSecop ?? null,
          observacion: dto.observacion ?? null,
          createdBy: actorId,
          updatedBy: actorId,
        });
        const guardado = await manager.save(proceso);

        if (dto.frentes?.length) {
          await manager.save(
            FrenteProceso,
            dto.frentes.map((frenteId) =>
              manager.create(FrenteProceso, {
                frenteId,
                procesoId: guardado.id,
                criterio: CriterioFrenteProceso.MANUAL,
              }),
            ),
          );
        }
        return guardado.id;
      },
    );

    return this.obtenerDetalle(id);
  }

  async actualizar(
    id: string,
    dto: ActualizarProcesoDto,
    actor: UsuarioAutenticado,
  ) {
    await this.verificarScope(id, actor);

    await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
      const resultado = await manager.update(ProcesoContratacion, id, {
        ...dto,
        updatedBy: actor.id,
      });
      if (!resultado.affected) {
        throw new NotFoundException('Proceso no encontrado');
      }
    });

    return this.obtenerDetalle(id);
  }

  async cambiarEstado(
    id: string,
    dto: CambiarEstadoProcesoDto,
    actor: UsuarioAutenticado,
  ) {
    await this.verificarScope(id, actor);

    await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
      const resultado = await manager.update(ProcesoContratacion, id, {
        estadoId: dto.estadoId,
        updatedBy: actor.id,
      });
      if (!resultado.affected) {
        throw new NotFoundException('Proceso no encontrado');
      }

      // Un solo request, una sola transacción: el cambio de estado y su nota
      // de bitácora se comitean o se revierten juntos.
      await manager.save(
        Seguimiento,
        manager.create(Seguimiento, {
          procesoId: id,
          fecha: dto.fecha ?? hoyIso(),
          nota: dto.nota,
          estadoId: dto.estadoId,
          autorId: actor.id,
          origen: OrigenSeguimiento.APP,
        }),
      );
    });

    return this.obtenerDetalle(id);
  }

  async eliminar(id: string, actorId: string): Promise<void> {
    await ejecutarConAuditoria(this.dataSource, actorId, async (manager) => {
      const resultado = await manager.delete(ProcesoContratacion, id);
      if (!resultado.affected) {
        throw new NotFoundException('Proceso no encontrado');
      }
    });
  }

  // FrenteScopeGuard (común) resuelve el frente desde :slug/:frenteId en la
  // URL; acá el recurso es el propio proceso, así que primero se resuelven
  // los frentes a los que pertenece y luego se aplica la misma regla EDITOR.
  private async verificarScope(
    procesoId: string,
    actor: UsuarioAutenticado,
  ): Promise<void> {
    if (actor.rol === RolUsuario.ADMIN) {
      return;
    }
    const vinculos = await this.frenteProcesoRepository.find({
      where: { procesoId },
    });
    await asegurarScopeFrente(
      this.usuarioFrenteRepository,
      actor,
      vinculos.map((v) => v.frenteId),
    );
  }
}
