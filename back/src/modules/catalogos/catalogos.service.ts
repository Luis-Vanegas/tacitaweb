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

export interface CatalogosResponse {
  estados: EstadoProceso[];
  dependencias: Dependencia[];
  proyectos: Proyecto[];
  contratistas: Contratista[];
  categoriasActividad: CategoriaActividad[];
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
  ) {}

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
    ]);

    const valor: CatalogosResponse = {
      estados,
      dependencias,
      proyectos,
      contratistas,
      categoriasActividad,
    };
    this.cache = { valor, expiraEn: ahora + TTL_MS };
    return valor;
  }
}
