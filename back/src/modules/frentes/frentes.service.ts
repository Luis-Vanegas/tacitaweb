import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { Workbook } from 'exceljs';
import { Frente } from '@/database/entities/frente.entity';
import { VResumenFrente } from '@/database/entities/views/resumen-frente.view-entity';
import { VProcesoDetalle } from '@/database/entities/views/proceso-detalle.view-entity';
import { VPersonalVigente } from '@/database/entities/views/personal-vigente.view-entity';
import {
  CriterioFrenteProceso,
  FrenteProceso,
} from '@/database/entities/frente-proceso.entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { PersonalOperador } from '@/database/entities/personal-operador.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { PaginadoDto } from '@/common/dto/paginado.dto';
import { FiltroProcesosFrenteDto } from './dto/filtro-procesos-frente.dto';
import { VincularProcesoFrenteDto } from './dto/vincular-proceso-frente.dto';

// Columnas (propiedades de la entidad, no nombres de columna SQL) por las que
// se puede ordenar /frentes/:slug/procesos. Lista blanca para no exponer
// `orden` como SQL crudo inyectable.
const ORDEN_PERMITIDO: Record<string, string> = {
  fechaInicio: 'v.fechaInicio',
  fechaTerminacion: 'v.fechaTerminacion',
  diasRestantes: 'v.diasRestantes',
  actividad: 'v.actividad',
  updatedAt: 'v.updatedAt',
};

@Injectable()
export class FrentesService {
  constructor(
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(VResumenFrente)
    private readonly resumenRepository: Repository<VResumenFrente>,
    @InjectRepository(VProcesoDetalle)
    private readonly procesoDetalleRepository: Repository<VProcesoDetalle>,
    @InjectRepository(VPersonalVigente)
    private readonly personalVigenteRepository: Repository<VPersonalVigente>,
    @InjectRepository(FrenteProceso)
    private readonly frenteProcesoRepository: Repository<FrenteProceso>,
    @InjectRepository(FrenteTipoPersonal)
    private readonly frenteTipoPersonalRepository: Repository<FrenteTipoPersonal>,
    @InjectRepository(PersonalCorte)
    private readonly personalCorteRepository: Repository<PersonalCorte>,
    @InjectRepository(PersonalOperador)
    private readonly personalOperadorRepository: Repository<PersonalOperador>,
    @InjectRepository(ProcesoContratacion)
    private readonly procesoRepository: Repository<ProcesoContratacion>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<VResumenFrente[]> {
    return this.resumenRepository.find({ order: { orden: 'ASC' } });
  }

  async obtenerDetalle(slug: string) {
    const frente = await this.resolverFrente(slug);
    const resumen = await this.resumenRepository.findOne({ where: { slug } });
    if (!resumen) {
      throw new NotFoundException(`Frente "${slug}" no encontrado`);
    }

    const vinculos = await this.frenteProcesoRepository.find({
      where: { frenteId: frente.id },
    });
    const idsProcesos = vinculos.map((v) => v.procesoId);

    let conteoPorEstado: {
      estadoId: number;
      estado: string;
      color: string;
      total: number;
    }[] = [];
    let dependenciasInvolucradas: { id: number; nombre: string }[] = [];

    if (idsProcesos.length > 0) {
      const detalle = await this.procesoDetalleRepository.find({
        where: { id: In(idsProcesos) },
      });

      const porEstado = new Map<
        number,
        { estado: string; color: string; total: number }
      >();
      const porDependencia = new Map<number, string>();
      for (const p of detalle) {
        const actual = porEstado.get(p.estadoId) ?? {
          estado: p.estado,
          color: p.estadoColor,
          total: 0,
        };
        actual.total += 1;
        porEstado.set(p.estadoId, actual);
        porDependencia.set(p.dependenciaId, p.dependencia);
      }
      conteoPorEstado = [...porEstado.entries()].map(([estadoId, v]) => ({
        estadoId,
        ...v,
      }));
      dependenciasInvolucradas = [...porDependencia.entries()].map(
        ([id, nombre]) => ({ id, nombre }),
      );
    }

    return { ...resumen, conteoPorEstado, dependenciasInvolucradas };
  }

  async listarProcesos(
    slug: string,
    filtro: FiltroProcesosFrenteDto,
  ): Promise<PaginadoDto<VProcesoDetalle>> {
    const frente = await this.resolverFrente(slug);
    const page = filtro.page ?? 1;
    const pageSize = filtro.pageSize ?? 20;

    const qb = this.procesoDetalleRepository
      .createQueryBuilder('v')
      .innerJoin(FrenteProceso, 'fp', 'fp.procesoId = v.id')
      .where('fp.frenteId = :frenteId', { frenteId: frente.id });

    if (filtro.estado) {
      qb.andWhere('v.estadoCodigo = :estado', { estado: filtro.estado });
    }
    if (filtro.fase) {
      qb.andWhere('v.fase = :fase', { fase: filtro.fase });
    }
    if (filtro.dependencia) {
      qb.andWhere('v.dependenciaId = :dependencia', {
        dependencia: filtro.dependencia,
      });
    }
    if (filtro.tipo) {
      qb.andWhere('v.tipo = :tipo', { tipo: filtro.tipo });
    }
    if (filtro.esAlerta) {
      qb.andWhere('v.esAlerta = true');
    }
    if (filtro.proximosVencer) {
      // Misma definición que "proximos_vencer" en v_resumen_frente.
      qb.andWhere(
        "v.fase = 'CONTRACTUAL' and v.diasRestantes between 0 and 30",
      );
    }
    if (filtro.q) {
      qb.andWhere(
        '(v.numeroContrato ILIKE :q OR v.numeroNecesidad ILIKE :q OR v.actividad ILIKE :q OR v.contratista ILIKE :q)',
        { q: `%${filtro.q}%` },
      );
    }

    const [campoOrden, direccion] = (filtro.orden ?? 'updatedAt:desc').split(
      ':',
    );
    const columnaOrden =
      ORDEN_PERMITIDO[campoOrden] ?? ORDEN_PERMITIDO.updatedAt;
    const direccionOrden = direccion?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    qb.orderBy(columnaOrden, direccionOrden);
    qb.skip((page - 1) * pageSize).take(pageSize);

    const [data, total] = await qb.getManyAndCount();
    return new PaginadoDto(data, { page, pageSize, total });
  }

  async obtenerPersonal(slug: string) {
    const frente = await this.resolverFrente(slug);
    const vinculos = await this.frenteTipoPersonalRepository.find({
      where: { frenteId: frente.id },
    });
    const tipoIds = vinculos.map((v) => v.tipoPersonalId);

    if (tipoIds.length === 0) {
      return { vigente: [], historico: [], operadores: [] };
    }

    const vigente = await this.personalVigenteRepository.find({
      where: { tipoPersonalId: In(tipoIds) },
    });
    const historico = await this.personalCorteRepository.find({
      where: { tipoPersonalId: In(tipoIds) },
      order: { vigencia: 'DESC' },
    });
    const corteIds = historico.map((h) => h.id);
    const operadores = corteIds.length
      ? await this.personalOperadorRepository.find({
          where: { corteId: In(corteIds) },
          relations: ['contratista'],
        })
      : [];

    return { vigente, historico, operadores };
  }

  async vincularProceso(
    slug: string,
    procesoId: string,
    dto: VincularProcesoFrenteDto,
    actorId: string,
  ): Promise<void> {
    const frente = await this.resolverFrente(slug);
    const proceso = await this.procesoRepository.findOne({
      where: { id: procesoId },
    });
    if (!proceso) {
      throw new NotFoundException('Proceso no encontrado');
    }

    await ejecutarConAuditoria(this.dataSource, actorId, async (manager) => {
      const existente = await manager.findOne(FrenteProceso, {
        where: { frenteId: frente.id, procesoId },
      });
      if (existente) {
        existente.criterio = CriterioFrenteProceso.MANUAL;
        existente.nota = dto.nota ?? existente.nota;
        await manager.save(existente);
        return;
      }
      await manager.save(
        manager.create(FrenteProceso, {
          frenteId: frente.id,
          procesoId,
          criterio: CriterioFrenteProceso.MANUAL,
          nota: dto.nota ?? null,
        }),
      );
    });
  }

  async desvincularProceso(
    slug: string,
    procesoId: string,
    actorId: string,
  ): Promise<void> {
    const frente = await this.resolverFrente(slug);
    await ejecutarConAuditoria(this.dataSource, actorId, async (manager) => {
      const resultado = await manager.delete(FrenteProceso, {
        frenteId: frente.id,
        procesoId,
      });
      if (!resultado.affected) {
        throw new NotFoundException(
          'El proceso no está vinculado a este frente',
        );
      }
    });
  }

  // GET /frentes/:slug/export — Excel con procesos y personal del frente,
  // mismos joins que listarProcesos()/obtenerPersonal() pero sin paginación
  // (el reporte se descarga completo).
  async exportarExcel(slug: string): Promise<Buffer> {
    const frente = await this.resolverFrente(slug);

    const procesos = await this.procesoDetalleRepository
      .createQueryBuilder('v')
      .innerJoin(FrenteProceso, 'fp', 'fp.procesoId = v.id')
      .where('fp.frenteId = :frenteId', { frenteId: frente.id })
      .orderBy('v.actividad', 'ASC')
      .addOrderBy('v.fechaInicio', 'ASC')
      .getMany();

    const vinculosPersonal = await this.frenteTipoPersonalRepository.find({
      where: { frenteId: frente.id },
    });
    const tipoIds = vinculosPersonal.map((v) => v.tipoPersonalId);
    const personal = tipoIds.length
      ? await this.personalVigenteRepository.find({
          where: { tipoPersonalId: In(tipoIds) },
          order: { tipoPersonal: 'ASC' },
        })
      : [];

    return this.construirExcelFrente(procesos, personal);
  }

  private async construirExcelFrente(
    procesos: VProcesoDetalle[],
    personal: VPersonalVigente[],
  ): Promise<Buffer> {
    const workbook = new Workbook();

    const hojaProcesos = workbook.addWorksheet('Procesos');
    hojaProcesos.columns = [
      { header: 'Actividad', key: 'actividad', width: 30 },
      { header: 'Contratista', key: 'contratista', width: 30 },
      { header: 'Tipo', key: 'tipo', width: 14 },
      { header: 'N.º contrato', key: 'numeroContrato', width: 16 },
      { header: 'N.º necesidad', key: 'numeroNecesidad', width: 16 },
      { header: 'Estado', key: 'estado', width: 18 },
      { header: 'Fase', key: 'fase', width: 16 },
      { header: 'Fecha inicio', key: 'fechaInicio', width: 14 },
      { header: 'Fecha terminación', key: 'fechaTerminacion', width: 16 },
      { header: 'Días restantes', key: 'diasRestantes', width: 14 },
      { header: '% plazo', key: 'pctPlazo', width: 10 },
      { header: 'Link SECOP', key: 'linkSecop', width: 40 },
    ];
    hojaProcesos.getRow(1).font = { bold: true };
    hojaProcesos.addRows(
      procesos.map((p) => ({
        actividad: p.actividad,
        contratista: p.contratista ?? '',
        tipo: p.tipo,
        numeroContrato: p.numeroContrato ?? '',
        numeroNecesidad: p.numeroNecesidad ?? '',
        estado: p.estado,
        fase: p.fase,
        fechaInicio: p.fechaInicio ?? '',
        fechaTerminacion: p.fechaTerminacion ?? '',
        diasRestantes: p.diasRestantes ?? '',
        pctPlazo: p.pctPlazo ?? '',
        linkSecop: p.linkSecop ?? '',
      })),
    );

    const hojaPersonal = workbook.addWorksheet('Personal');
    hojaPersonal.columns = [
      { header: 'Tipo de personal', key: 'tipoPersonal', width: 30 },
      { header: 'Vigencia', key: 'vigencia', width: 12 },
      { header: 'Actual', key: 'actual', width: 10 },
      { header: 'Pendiente', key: 'pendiente', width: 12 },
      { header: 'Meta', key: 'meta', width: 10 },
      { header: 'Fecha final', key: 'fechaFinal', width: 14 },
    ];
    hojaPersonal.getRow(1).font = { bold: true };
    hojaPersonal.addRows(
      personal.map((p) => ({
        tipoPersonal: p.tipoPersonal,
        vigencia: p.vigencia,
        actual: p.actual,
        pendiente: p.pendiente ?? '',
        meta: p.meta ?? '',
        fechaFinal: p.fechaFinal ?? '',
      })),
    );

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  private async resolverFrente(slug: string): Promise<Frente> {
    const frente = await this.frenteRepository.findOne({ where: { slug } });
    if (!frente) {
      throw new NotFoundException(`Frente "${slug}" no encontrado`);
    }
    return frente;
  }
}
