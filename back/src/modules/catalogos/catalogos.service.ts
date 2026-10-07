// ponytail: cache en memoria (un objeto con expiración), una sola instancia —
// no se invalida entre réplicas si el backend escala horizontalmente, y un
// alta/edición de catálogo desde /usuarios u otro módulo no la invalida antes
// de los 5 min. Si eso importa, subir a Redis (o similar) con invalidación
// activa al escribir. Mientras tanto: TTL corto y catálogos que cambian poco.
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EstadoProceso } from '@/database/entities/estado-proceso.entity';
import { Dependencia } from '@/database/entities/dependencia.entity';
import { Proyecto } from '@/database/entities/proyecto.entity';
import { Contratista } from '@/database/entities/contratista.entity';
import { CategoriaActividad } from '@/database/entities/categoria-actividad.entity';
import { TipoPersonal } from '@/database/entities/tipo-personal.entity';
import { Actividad } from '@/database/entities/actividad.entity';

export interface TipoPersonalCatalogo {
  id: number;
  nombre: string;
}

// Plana (sin la entidad completa): el front la usa en selects agrupados por
// dependencia y la importación Excel la usa para resolver (dependencia, actividad).
export interface ActividadCatalogo {
  id: number;
  nombre: string;
  dependenciaId: number;
  dependencia: string;
}

export interface CatalogosResponse {
  estados: EstadoProceso[];
  dependencias: Dependencia[];
  proyectos: Proyecto[];
  contratistas: Contratista[];
  categoriasActividad: CategoriaActividad[];
  tiposPersonal: TipoPersonalCatalogo[];
  actividades: ActividadCatalogo[];
}

const TTL_MS = 5 * 60 * 1000;

@Injectable()
export class CatalogosService {
  private cache: { valor: CatalogosResponse; expiraEn: number } | null = null;

  constructor(
    @InjectRepository(EstadoProceso)
    private readonly estadoRepository: Repository<EstadoProceso>,
    @InjectRepository(Dependencia)
    private readonly dependenciaRepository: Repository<Dependencia>,
    @InjectRepository(Proyecto)
    private readonly proyectoRepository: Repository<Proyecto>,
    @InjectRepository(Contratista)
    private readonly contratistaRepository: Repository<Contratista>,
    @InjectRepository(CategoriaActividad)
    private readonly categoriaActividadRepository: Repository<CategoriaActividad>,
    @InjectRepository(TipoPersonal)
    private readonly tipoPersonalRepository: Repository<TipoPersonal>,
    @InjectRepository(Actividad)
    private readonly actividadRepository: Repository<Actividad>,
  ) {}

  // Para quien escriba catálogos en este mismo proceso y no quiera esperar el TTL.
  invalidar(): void {
    this.cache = null;
  }

  async obtener(): Promise<CatalogosResponse> {
    const ahora = Date.now();
    if (this.cache && this.cache.expiraEn > ahora) {
      return this.cache.valor;
    }

    const [
      estados,
      dependencias,
      proyectos,
      contratistas,
      categoriasActividad,
      tiposPersonal,
      actividades,
    ] = await Promise.all([
      this.estadoRepository.find({ order: { orden: 'ASC' } }),
      this.dependenciaRepository.find({
        where: { activo: true },
        order: { nombre: 'ASC' },
      }),
      this.proyectoRepository.find({
        where: { activo: true },
        order: { nombre: 'ASC' },
      }),
      this.contratistaRepository.find({ order: { nombre: 'ASC' } }),
      this.categoriaActividadRepository.find({ order: { orden: 'ASC' } }),
      this.tipoPersonalRepository.find({
        where: { activo: true },
        order: { nombre: 'ASC' },
      }),
      this.actividadRepository.find({
        relations: ['dependencia'],
        order: { nombre: 'ASC' },
      }),
    ]);

    const valor: CatalogosResponse = {
      estados,
      dependencias,
      proyectos,
      contratistas,
      categoriasActividad,
      tiposPersonal: tiposPersonal.map((t) => ({ id: t.id, nombre: t.nombre })),
      actividades: actividades.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        dependenciaId: a.dependenciaId,
        dependencia: a.dependencia.nombre,
      })),
    };
    this.cache = { valor, expiraEn: ahora + TTL_MS };
    return valor;
  }
}
