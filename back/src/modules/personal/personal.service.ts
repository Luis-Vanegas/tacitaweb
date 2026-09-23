import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { asegurarScopeFrente } from '@/common/database/frente-scope.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { ActualizarCortePersonalDto } from './dto/actualizar-corte-personal.dto';
import { CrearCortePersonalDto } from './dto/crear-corte-personal.dto';

@Injectable()
export class PersonalService {
  constructor(
    @InjectRepository(PersonalCorte)
    private readonly corteRepository: Repository<PersonalCorte>,
    @InjectRepository(FrenteTipoPersonal)
    private readonly frenteTipoPersonalRepository: Repository<FrenteTipoPersonal>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
    private readonly dataSource: DataSource,
  ) {}

  async actualizarCorte(
    id: string,
    dto: ActualizarCortePersonalDto,
    actor: UsuarioAutenticado,
  ): Promise<PersonalCorte> {
    const corte = await this.corteRepository.findOne({ where: { id } });
    if (!corte) {
      throw new NotFoundException('Corte de personal no encontrado');
    }
    await this.verificarScope(corte.tipoPersonalId, actor);

    await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
      await manager.update(PersonalCorte, id, dto);
    });

    return (await this.corteRepository.findOne({ where: { id } }))!;
  }

  async crearCorte(
    dto: CrearCortePersonalDto,
    actor: UsuarioAutenticado,
  ): Promise<PersonalCorte> {
    await this.verificarScope(dto.tipoPersonalId, actor);

    const id = await ejecutarConAuditoria(
      this.dataSource,
      actor.id,
      async (manager) => {
        const guardado = await manager.save(manager.create(PersonalCorte, dto));
        return guardado.id;
      },
    );

    return (await this.corteRepository.findOne({ where: { id } }))!;
  }

  private async verificarScope(
    tipoPersonalId: number,
    actor: UsuarioAutenticado,
  ): Promise<void> {
    if (actor.rol === RolUsuario.ADMIN) {
      return;
    }
    const vinculos = await this.frenteTipoPersonalRepository.find({
      where: { tipoPersonalId },
    });
    await asegurarScopeFrente(
      this.usuarioFrenteRepository,
      actor,
      vinculos.map((v) => v.frenteId),
    );
  }
}
