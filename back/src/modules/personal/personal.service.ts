import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { VPersonalVigente } from '@/database/entities/views/personal-vigente.view-entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { RolUsuario } from '@/database/entities/usuario.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { asegurarScopeFrente } from '@/common/database/frente-scope.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { ActualizarCortePersonalDto } from './dto/actualizar-corte-personal.dto';
import { CrearCortePersonalDto } from './dto/crear-corte-personal.dto';

export interface FrenteResumido {
  slug: string;
  nombre: string;
  color: string;
}

export type PersonalGeneralItem = VPersonalVigente & {
  frentes: FrenteResumido[];
};

export interface PersonalGeneral {
  items: PersonalGeneralItem[];
  totales: { actual: number; pendiente: number; meta: number };
  // Filas crudas de personal_corte (mismo formato que GET /frentes/:slug/personal)
  // para precargar el di�logo de edici�n: la vista calcula `pendiente`.
  historico: PersonalCorte[];
}

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
    @InjectRepository(VPersonalVigente)
    private readonly personalVigenteRepository: Repository<VPersonalVigente>,
  ) {}

  // Vista general de todos los frentes. Se parte de v_personal_vigente (una
  // fila por tipo de personal) y se adjuntan sus frentes, en vez de recorrer
  // frente por frente: un tipo ligado a varios frentes (p. ej. Espacio P�blico)
  // se contar�a doble en los totales.
  async listarGeneral(): Promise<PersonalGeneral> {
    const [vigente, vinculos, historico] = await Promise.all([
      this.personalVigenteRepository.find({
        order: { tipoPersonal: 'ASC' },
      }),
      this.frenteTipoPersonalRepository.find({
        relations: { frente: true },
        order: { frente: { orden: 'ASC' } },
      }),
      this.corteRepository.find({ order: { vigencia: 'DESC' } }),
    ]);

    const frentesPorTipo = new Map<number, FrenteResumido[]>();
    for (const { tipoPersonalId, frente } of vinculos) {
      // Igual que v_resumen_frente, que solo considera frentes activos.
      if (!frente?.activo) continue;
      const lista = frentesPorTipo.get(tipoPersonalId) ?? [];
      lista.push({
        slug: frente.slug,
        nombre: frente.nombre,
        color: frente.color,
      });
      frentesPorTipo.set(tipoPersonalId, lista);
    }

    const items = vigente.map((fila) => ({
      ...fila,
      frentes: frentesPorTipo.get(fila.tipoPersonalId) ?? [],
    }));

    // Mismo criterio que v_resumen_frente: sum(actual) y
    // sum(greatest(pendiente, 0)); un pendiente negativo (actual > meta) no
    // resta. Number(): por si el driver devuelve enteros como string.
    const totales = items.reduce(
      (acc, fila) => ({
        actual: acc.actual + Number(fila.actual ?? 0),
        pendiente: acc.pendiente + Math.max(Number(fila.pendiente ?? 0), 0),
        meta: acc.meta + Number(fila.meta ?? 0),
      }),
      { actual: 0, pendiente: 0, meta: 0 },
    );

    return { items, totales, historico };
  }

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

  // Público: la importación Excel aplica la misma regla fila por fila.
  async verificarScope(
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
