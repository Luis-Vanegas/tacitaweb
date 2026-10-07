import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Compromiso } from '@/database/entities/compromiso.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { ActualizarCompromisoDto } from './dto/actualizar-compromiso.dto';
import { CrearCompromisoDto } from './dto/crear-compromiso.dto';

// Sin scope de frente: core.compromiso no tiene FK a frente (son compromisos
// del proyecto en general). El control de acceso es solo por rol.
@Injectable()
export class CompromisosService {
  constructor(
    @InjectRepository(Compromiso)
    private readonly compromisoRepository: Repository<Compromiso>,
    private readonly dataSource: DataSource,
  ) {}

  // Los que vencen primero arriba; sin fecha al final.
  listar(): Promise<Compromiso[]> {
    return this.compromisoRepository.find({
      order: {
        fechaCumplimiento: { direction: 'ASC', nulls: 'LAST' },
        id: 'ASC',
      },
    });
  }

  async crear(
    dto: CrearCompromisoDto,
    actor: UsuarioAutenticado,
  ): Promise<Compromiso> {
    const id = await ejecutarConAuditoria(
      this.dataSource,
      actor.id,
      async (manager) => {
        const guardado = await manager.save(manager.create(Compromiso, dto));
        return guardado.id;
      },
    );
    // Se relee para devolver lo que quedó en la BD (default de estado, fechas).
    return (await this.compromisoRepository.findOne({ where: { id } }))!;
  }

  async actualizar(
    id: number,
    dto: ActualizarCompromisoDto,
    actor: UsuarioAutenticado,
  ): Promise<Compromiso> {
    await this.obtenerOFallar(id);
    await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
      await manager.update(Compromiso, id, dto);
    });
    return (await this.compromisoRepository.findOne({ where: { id } }))!;
  }

  async eliminar(id: number, actor: UsuarioAutenticado): Promise<void> {
    await this.obtenerOFallar(id);
    await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
      await manager.delete(Compromiso, id);
    });
  }

  private async obtenerOFallar(id: number): Promise<Compromiso> {
    const compromiso = await this.compromisoRepository.findOne({
      where: { id },
    });
    if (!compromiso) {
      throw new NotFoundException('Compromiso no encontrado');
    }
    return compromiso;
  }
}
