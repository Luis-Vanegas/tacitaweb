// Carga/actualización masiva desde Excel en dos pasos: sin `confirmar` solo
// valida y cuenta (vista previa); con `confirmar` y cero errores escribe todo
// en UNA transacción auditada. Todo o nada: con cualquier error de fila no se
// escribe nada. No crea catálogos: los nombres se resuelven contra la BD y lo
// que no existe es un error de fila.
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Workbook } from 'exceljs';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
import {
  ProcesoContratacion,
  TipoProceso,
} from '@/database/entities/proceso-contratacion.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { Frente } from '@/database/entities/frente.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { OrigenSeguimiento } from '@/database/entities/seguimiento.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { asegurarScopeFrente } from '@/common/database/frente-scope.helper';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { CatalogosService } from '../catalogos/catalogos.service';
import { ProcesosService } from '../procesos/procesos.service';
import { PersonalService } from '../personal/personal.service';
import {
  aDigitos,
  aEntero,
  aFecha,
  aTexto,
  ColumnaPlantilla,
  Conversion,
  FilaLeida,
  leerHoja,
  normalizarTexto,
  ValorCelda,
} from './importacion.parser';

export enum TipoImportacion {
  PROCESOS = 'procesos',
  PERSONAL = 'personal',
}

export interface ErrorImportacion {
  fila: number;
  columna?: string;
  mensaje: string;
}

export interface ResultadoImportacion {
  total: number;
  creados: number;
  actualizados: number;
  sinCambios: number;
  errores: ErrorImportacion[];
  confirmado: boolean;
}

type Accion = 'crear' | 'actualizar' | 'sinCambios';

interface Operacion {
  accion: Accion;
  ejecutar?: (manager: EntityManager) => Promise<void>;
}

interface Plan {
  total: number;
  errores: ErrorImportacion[];
  operaciones: Operacion[];
}

type ClaveProceso =
  | 'dependencia'
  | 'actividad'
  | 'contratista'
  | 'tipo'
  | 'numeroContrato'
  | 'numeroNecesidad'
  | 'estado'
  | 'fechaInicio'
  | 'fechaTerminacion'
  | 'linkSecop'
  | 'observacion'
  | 'frente';

// Mismo orden y nombres que la hoja "Procesos" del export de frentes, más lo
// que hace falta para resolver ids (Dependencia) y vincular (Frente).
export const COLUMNAS_PROCESOS: ColumnaPlantilla<ClaveProceso>[] = [
  {
    clave: 'dependencia',
    encabezado: 'Dependencia',
    requerida: true,
    ancho: 30,
  },
  { clave: 'actividad', encabezado: 'Actividad', requerida: true, ancho: 30 },
  { clave: 'contratista', encabezado: 'Contratista', ancho: 30 },
  { clave: 'tipo', encabezado: 'Tipo', ancho: 14 },
  {
    clave: 'numeroContrato',
    encabezado: 'N.º contrato',
    alias: ['numero contrato', 'no contrato', 'contrato'],
    ancho: 16,
  },
  {
    clave: 'numeroNecesidad',
    encabezado: 'N.º necesidad',
    alias: ['numero necesidad', 'no necesidad', 'necesidad'],
    ancho: 16,
  },
  { clave: 'estado', encabezado: 'Estado', requerida: true, ancho: 22 },
  { clave: 'fechaInicio', encabezado: 'Fecha inicio', ancho: 14 },
  { clave: 'fechaTerminacion', encabezado: 'Fecha terminación', ancho: 16 },
  {
    clave: 'linkSecop',
    encabezado: 'Link SECOP',
    alias: ['secop'],
    hyperlink: true,
    ancho: 40,
  },
  {
    clave: 'observacion',
    encabezado: 'Observación',
    alias: ['observaciones'],
    ancho: 40,
  },
  { clave: 'frente', encabezado: 'Frente', alias: ['frentes'], ancho: 30 },
];

type ClavePersonal =
  | 'tipoPersonal'
  | 'vigencia'
  | 'actual'
  | 'pendiente'
  | 'meta'
  | 'fechaFinal'
  | 'observaciones';

export const COLUMNAS_PERSONAL: ColumnaPlantilla<ClavePersonal>[] = [
  {
    clave: 'tipoPersonal',
    encabezado: 'Tipo de personal',
    requerida: true,
    ancho: 30,
  },
  { clave: 'vigencia', encabezado: 'Vigencia', requerida: true, ancho: 12 },
  { clave: 'actual', encabezado: 'Actual', requerida: true, ancho: 10 },
  { clave: 'pendiente', encabezado: 'Pendiente', ancho: 12 },
  { clave: 'meta', encabezado: 'Meta', ancho: 10 },
  { clave: 'fechaFinal', encabezado: 'Fecha final', ancho: 14 },
  {
    clave: 'observaciones',
    encabezado: 'Observaciones',
    alias: ['observacion'],
    ancho: 40,
  },
];

const LINK_HTTPS = /^https:\/\//i;

// Índice nombre normalizado -> elementos. Una lista con más de uno significa
// que el nombre es ambiguo (normalizarTexto quita tildes, la BD no).
function indexar<T>(
  items: T[],
  ...claves: ((item: T) => string | null | undefined)[]
): Map<string, T[]> {
  const indice = new Map<string, T[]>();
  for (const item of items) {
    const vistas = new Set<string>();
    for (const clave of claves) {
      const texto = clave(item);
      if (!texto) continue;
      const normal = normalizarTexto(texto);
      if (vistas.has(normal)) continue;
      vistas.add(normal);
      indice.set(normal, [...(indice.get(normal) ?? []), item]);
    }
  }
  return indice;
}

// Acumula errores de una fila y devuelve el valor convertido (o null).
class ValidadorFila {
  readonly errores: ErrorImportacion[] = [];

  constructor(readonly fila: number) {}

  error(columna: string | undefined, mensaje: string): void {
    this.errores.push({ fila: this.fila, columna, mensaje });
  }

  convertir<T>(columna: string, conversion: Conversion<T>): T | null {
    if (!conversion.ok) {
      this.error(columna, conversion.error);
      return null;
    }
    return conversion.valor;
  }

  resolver<T>(
    columna: string,
    valor: ValorCelda,
    indice: Map<string, T[]>,
    requerida: boolean,
  ): T | null {
    const texto = aTexto(valor);
    if (texto === null) {
      if (requerida) this.error(columna, 'Es obligatorio');
      return null;
    }
    const encontrados = indice.get(normalizarTexto(texto)) ?? [];
    if (encontrados.length === 1) return encontrados[0];
    this.error(
      columna,
      encontrados.length
        ? `"${texto}" es ambiguo: coincide con varios registros`
        : `"${texto}" no existe`,
    );
    return null;
  }
}

function esProhibido(error: unknown): boolean {
  return error instanceof ForbiddenException;
}

@Injectable()
export class ImportacionService {
  constructor(
    @InjectRepository(ProcesoContratacion)
    private readonly procesoRepository: Repository<ProcesoContratacion>,
    @InjectRepository(PersonalCorte)
    private readonly corteRepository: Repository<PersonalCorte>,
    @InjectRepository(Frente)
    private readonly frenteRepository: Repository<Frente>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
    private readonly catalogosService: CatalogosService,
    private readonly procesosService: ProcesosService,
    private readonly personalService: PersonalService,
    private readonly dataSource: DataSource,
  ) {}

  async importar(
    tipo: TipoImportacion,
    buffer: Buffer,
    confirmar: boolean,
    actor: UsuarioAutenticado,
  ): Promise<ResultadoImportacion> {
    const plan =
      tipo === TipoImportacion.PROCESOS
        ? await this.planificarProcesos(buffer, actor)
        : await this.planificarPersonal(buffer, actor);

    const contar = (accion: Accion) =>
      plan.operaciones.filter((o) => o.accion === accion).length;
    const errores = [...plan.errores].sort((a, b) => a.fila - b.fila);
    const confirmado = confirmar && errores.length === 0;

    if (confirmado) {
      await ejecutarConAuditoria(this.dataSource, actor.id, async (manager) => {
        for (const operacion of plan.operaciones) {
          await operacion.ejecutar?.(manager);
        }
      });
    }

    return {
      total: plan.total,
      creados: contar('crear'),
      actualizados: contar('actualizar'),
      sinCambios: contar('sinCambios'),
      errores,
      confirmado,
    };
  }

  async generarPlantilla(tipo: TipoImportacion): Promise<Buffer> {
    const catalogos = await this.catalogosService.obtener();
    const workbook = new Workbook();
    const procesos = tipo === TipoImportacion.PROCESOS;
    const columnas: ColumnaPlantilla<string>[] = procesos
      ? COLUMNAS_PROCESOS
      : COLUMNAS_PERSONAL;

    const hoja = workbook.addWorksheet(procesos ? 'Procesos' : 'Personal');
    hoja.columns = columnas.map((c) => ({
      header: c.encabezado,
      key: c.clave,
      width: c.ancho ?? 16,
    }));
    hoja.getRow(1).font = { bold: true };

    const instrucciones = workbook.addWorksheet('Instrucciones');
    instrucciones.getColumn(1).width = 100;
    const lineas = procesos
      ? [
          'Obligatorias: Dependencia, Actividad, Estado y al menos N.º contrato o N.º necesidad.',
          'Si el N.º contrato ya existe se actualiza ese proceso; si no, se busca por N.º necesidad + Actividad.',
          'En actualizaciones, una celda vacía conserva el valor actual. Frente solo se usa al crear (slug o nombre, varios separados por ";").',
          'Fechas: AAAA-MM-DD o DD/MM/AAAA. Link SECOP debe empezar con https://.',
          'Tipo: PRINCIPAL (por defecto) o INTERVENTORIA.',
          '',
          'Estados válidos:',
          ...catalogos.estados.map((e) => `  ${e.nombre}`),
        ]
      : [
          'Obligatorias: Tipo de personal, Vigencia (2020-2100) y Actual.',
          'Si ya existe un corte para el mismo tipo y vigencia se actualiza; si no, se crea.',
          'En actualizaciones, una celda vacía conserva el valor actual. Fechas: AAAA-MM-DD o DD/MM/AAAA.',
          '',
          'Tipos de personal válidos:',
          ...catalogos.tiposPersonal.map((t) => `  ${t.nombre}`),
        ];
    lineas.forEach((linea) => instrucciones.addRow([linea]));

    return Buffer.from(await workbook.xlsx.writeBuffer());
  }

  private async leer<K extends string>(
    buffer: Buffer,
    columnas: ColumnaPlantilla<K>[],
  ): Promise<{ filas: FilaLeida<K>[]; errores: ErrorImportacion[] }> {
    try {
      const { filas, columnasFaltantes } = await leerHoja(buffer, columnas);
      return {
        filas,
        errores: columnasFaltantes.map((columna) => ({
          fila: 1,
          columna,
          mensaje: 'Falta la columna en el encabezado',
        })),
      };
    } catch {
      throw new BadRequestException('El archivo no es un Excel (.xlsx) válido');
    }
  }

  private async planificarProcesos(
    buffer: Buffer,
    actor: UsuarioAutenticado,
  ): Promise<Plan> {
    const lectura = await this.leer(buffer, COLUMNAS_PROCESOS);
    if (lectura.errores.length) {
      return { total: 0, errores: lectura.errores, operaciones: [] };
    }
    const leidas = lectura.filas;

    const [catalogos, frentes] = await Promise.all([
      this.catalogosService.obtener(),
      this.frenteRepository.find(),
    ]);
    // Nombres de dependencia (sin repetir) tomados de ambos catálogos: el de
    // dependencias solo trae las activas, pero sus actividades siguen vigentes.
    const dependencias = indexar(
      [
        ...new Set([
          ...catalogos.dependencias.map((d) => d.nombre),
          ...catalogos.actividades.map((a) => a.dependencia),
        ]),
      ],
      (nombre) => nombre,
    );
    const actividades = indexar(
      catalogos.actividades,
      (a) => `${a.dependencia}|${a.nombre}`,
    );
    const estados = indexar(
      catalogos.estados,
      (e) => e.nombre,
      (e) => e.codigo,
    );
    const contratistas = indexar(catalogos.contratistas, (c) => c.nombre);
    const indiceFrentes = indexar(
      frentes,
      (f) => f.slug,
      (f) => f.nombre,
    );
    const tipos = indexar(Object.values(TipoProceso), (t) => t);

    const errores: ErrorImportacion[] = [];
    const operaciones: Operacion[] = [];

    // 1.ª pasada: convertir y resolver nombres de cada fila.
    const validas = leidas.flatMap((leida) => {
      const v = new ValidadorFila(leida.fila);
      const valores = leida.valores;

      const dependencia = v.resolver(
        'Dependencia',
        valores.dependencia ?? null,
        dependencias,
        true,
      );
      const actividad =
        dependencia !== null
          ? v.resolver(
              'Actividad',
              valores.actividad
                ? `${dependencia}|${aTexto(valores.actividad)}`
                : null,
              actividades,
              true,
            )
          : null;
      const estado = v.resolver(
        'Estado',
        valores.estado ?? null,
        estados,
        true,
      );
      const contratista = v.resolver(
        'Contratista',
        valores.contratista ?? null,
        contratistas,
        false,
      );
      const tipo = v.resolver('Tipo', valores.tipo ?? null, tipos, false);
      const numeroContrato = v.convertir(
        'N.º contrato',
        aDigitos(valores.numeroContrato ?? null),
      );
      const numeroNecesidad = v.convertir(
        'N.º necesidad',
        aDigitos(valores.numeroNecesidad ?? null),
      );
      const fechaInicio = v.convertir(
        'Fecha inicio',
        aFecha(valores.fechaInicio ?? null),
      );
      const fechaTerminacion = v.convertir(
        'Fecha terminación',
        aFecha(valores.fechaTerminacion ?? null),
      );
      const linkSecop = aTexto(valores.linkSecop ?? null);
      if (linkSecop !== null && !LINK_HTTPS.test(linkSecop)) {
        v.error('Link SECOP', 'Debe ser una URL que empiece con https://');
      }
      const frentesFila = (aTexto(valores.frente ?? null) ?? '')
        .split(';')
        .map((t) => t.trim())
        .filter(Boolean)
        .map((t) => v.resolver('Frente', t, indiceFrentes, false));

      if (
        !valores.numeroContrato &&
        !valores.numeroNecesidad &&
        !v.errores.length
      ) {
        v.error(
          undefined,
          'Falta N.º contrato o N.º necesidad para identificar el proceso',
        );
      }

      errores.push(...v.errores);
      if (v.errores.length) return [];
      return [
        {
          fila: leida.fila,
          actividad: actividad!,
          estado: estado!,
          contratistaId: contratista?.id ?? null,
          tipo,
          numeroContrato,
          numeroNecesidad,
          fechaInicio,
          fechaTerminacion,
          linkSecop,
          observacion: aTexto(valores.observacion ?? null),
          frenteIds: frentesFila.map((f) => f!.id),
        },
      ];
    });

    // 2.ª pasada: decidir crear/actualizar contra lo que ya está en la BD.
    const contratos = validas.flatMap((f) =>
      f.numeroContrato ? [f.numeroContrato] : [],
    );
    const necesidades = validas.flatMap((f) =>
      f.numeroNecesidad ? [f.numeroNecesidad] : [],
    );
    const filtros = [
      ...(contratos.length ? [{ numeroContrato: In(contratos) }] : []),
      ...(necesidades.length ? [{ numeroNecesidad: In(necesidades) }] : []),
    ];
    const existentes = filtros.length
      ? await this.procesoRepository.find({ where: filtros })
      : [];

    const clavesVistas = new Map<string, number>();
    const destinosVistos = new Map<string, number>();

    for (const f of validas) {
      const v = new ValidadorFila(f.fila);
      const clave = f.numeroContrato
        ? `contrato:${f.numeroContrato}`
        : `necesidad:${f.numeroNecesidad}|${f.actividad.id}`;
      const repetida = clavesVistas.get(clave);
      if (repetida !== undefined) {
        v.error(undefined, `Proceso repetido en el archivo (fila ${repetida})`);
        errores.push(...v.errores);
        continue;
      }
      clavesVistas.set(clave, f.fila);

      // Por contrato; si no existe, por necesidad + actividad. Cuando la fila
      // trae contrato, solo se consideran procesos que aún no tienen uno
      // (el precontractual que ahora recibe su número).
      let candidatos = f.numeroContrato
        ? existentes.filter((p) => p.numeroContrato === f.numeroContrato)
        : [];
      if (!candidatos.length && f.numeroNecesidad) {
        candidatos = existentes.filter(
          (p) =>
            p.numeroNecesidad === f.numeroNecesidad &&
            p.actividadId === f.actividad.id &&
            (!f.numeroContrato || p.numeroContrato === null),
        );
      }
      if (candidatos.length > 1) {
        v.error(
          'N.º necesidad',
          'Varios procesos coinciden con esta necesidad y actividad; indique el N.º contrato',
        );
        errores.push(...v.errores);
        continue;
      }

      const existente = candidatos[0];
      if (!existente) {
        if (f.frenteIds.length) {
          try {
            await asegurarScopeFrente(
              this.usuarioFrenteRepository,
              actor,
              f.frenteIds,
            );
          } catch (error) {
            if (!esProhibido(error)) throw error;
            v.error('Frente', 'No tiene asignado ninguno de estos frentes');
          }
        }
        this.validarFechas(v, f.fechaInicio, f.fechaTerminacion);
        errores.push(...v.errores);
        if (v.errores.length) continue;

        operaciones.push({
          accion: 'crear',
          ejecutar: async (manager) => {
            await this.procesosService.insertarProceso(
              manager,
              {
                actividadId: f.actividad.id,
                estadoId: f.estado.id,
                contratistaId: f.contratistaId ?? undefined,
                tipo: f.tipo ?? undefined,
                numeroContrato: f.numeroContrato ?? undefined,
                numeroNecesidad: f.numeroNecesidad ?? undefined,
                fechaInicio: f.fechaInicio ?? undefined,
                fechaTerminacion: f.fechaTerminacion ?? undefined,
                linkSecop: f.linkSecop ?? undefined,
                observacion: f.observacion ?? undefined,
                frentes: f.frenteIds,
              },
              actor.id,
            );
          },
        });
        continue;
      }

      const destino = destinosVistos.get(existente.id);
      if (destino !== undefined) {
        v.error(undefined, `Actualiza el mismo proceso que la fila ${destino}`);
        errores.push(...v.errores);
        continue;
      }
      destinosVistos.set(existente.id, f.fila);

      try {
        await this.procesosService.verificarScope(existente.id, actor);
      } catch (error) {
        if (!esProhibido(error)) throw error;
        v.error(undefined, 'No tiene asignado el frente de este proceso');
        errores.push(...v.errores);
        continue;
      }

      // Celda vacía = conservar el valor actual (no se borran datos por omisión).
      const propuesto = {
        actividadId: f.actividad.id,
        contratistaId: f.contratistaId,
        tipo: f.tipo,
        numeroContrato: f.numeroContrato,
        numeroNecesidad: f.numeroNecesidad,
        fechaInicio: f.fechaInicio,
        fechaTerminacion: f.fechaTerminacion,
        linkSecop: f.linkSecop,
        observacion: f.observacion,
      };
      const cambios: Partial<ProcesoContratacion> = {};
      for (const [campo, valor] of Object.entries(propuesto)) {
        const actual = existente[campo as keyof ProcesoContratacion];
        if (valor !== null && valor !== actual) {
          (cambios as Record<string, unknown>)[campo] = valor;
        }
      }
      this.validarFechas(
        v,
        cambios.fechaInicio ?? existente.fechaInicio,
        cambios.fechaTerminacion ?? existente.fechaTerminacion,
      );
      errores.push(...v.errores);
      if (v.errores.length) continue;

      const cambiaEstado = f.estado.id !== existente.estadoId;
      if (!Object.keys(cambios).length && !cambiaEstado) {
        operaciones.push({ accion: 'sinCambios' });
        continue;
      }

      operaciones.push({
        accion: 'actualizar',
        ejecutar: async (manager) => {
          if (Object.keys(cambios).length) {
            await manager.update(ProcesoContratacion, existente.id, {
              ...cambios,
              updatedBy: actor.id,
            });
          }
          if (cambiaEstado) {
            // Misma lógica que PATCH /procesos/:id/estado: el cambio de
            // estado siempre deja su nota en la bitácora.
            await this.procesosService.aplicarCambioEstado(
              manager,
              existente.id,
              {
                estadoId: f.estado.id,
                nota: `Estado cambiado a "${f.estado.nombre}" por carga de Excel`,
              },
              actor.id,
              OrigenSeguimiento.EXCEL,
            );
          }
        },
      });
    }

    return { total: leidas.length, errores, operaciones };
  }

  private async planificarPersonal(
    buffer: Buffer,
    actor: UsuarioAutenticado,
  ): Promise<Plan> {
    const lectura = await this.leer(buffer, COLUMNAS_PERSONAL);
    if (lectura.errores.length) {
      return { total: 0, errores: lectura.errores, operaciones: [] };
    }
    const leidas = lectura.filas;

    const catalogos = await this.catalogosService.obtener();
    const tipos = indexar(catalogos.tiposPersonal, (t) => t.nombre);
    const errores: ErrorImportacion[] = [];
    const operaciones: Operacion[] = [];

    const validas = leidas.flatMap((leida) => {
      const v = new ValidadorFila(leida.fila);
      const valores = leida.valores;
      const tipo = v.resolver(
        'Tipo de personal',
        valores.tipoPersonal ?? null,
        tipos,
        true,
      );
      // Rango = CHECK de core.personal_corte.vigencia.
      const vigencia = v.convertir(
        'Vigencia',
        aEntero(valores.vigencia ?? null, 2020, 2100),
      );
      const actual = v.convertir('Actual', aEntero(valores.actual ?? null, 0));
      if (valores.vigencia === undefined) v.error('Vigencia', 'Es obligatorio');
      if (valores.actual === undefined) v.error('Actual', 'Es obligatorio');
      const datos = {
        actual,
        pendiente: v.convertir(
          'Pendiente',
          aEntero(valores.pendiente ?? null, 0),
        ),
        meta: v.convertir('Meta', aEntero(valores.meta ?? null, 0)),
        fechaFinal: v.convertir(
          'Fecha final',
          aFecha(valores.fechaFinal ?? null),
        ),
        observaciones: aTexto(valores.observaciones ?? null),
      };
      errores.push(...v.errores);
      if (v.errores.length) return [];
      return [
        {
          fila: leida.fila,
          tipoPersonalId: tipo!.id,
          vigencia: vigencia!,
          datos,
        },
      ];
    });

    const tipoIds = [...new Set(validas.map((f) => f.tipoPersonalId))];
    const existentes = tipoIds.length
      ? await this.corteRepository.find({
          where: { tipoPersonalId: In(tipoIds) },
        })
      : [];
    const porClave = new Map(
      existentes.map((c) => [`${c.tipoPersonalId}|${c.vigencia}`, c]),
    );

    // El scope depende solo del tipo de personal: se verifica una vez por tipo.
    const scopePorTipo = new Map<number, boolean>();
    const clavesVistas = new Map<string, number>();

    for (const f of validas) {
      const v = new ValidadorFila(f.fila);
      const clave = `${f.tipoPersonalId}|${f.vigencia}`;
      const repetida = clavesVistas.get(clave);
      if (repetida !== undefined) {
        v.error(
          undefined,
          `Tipo de personal y vigencia repetidos en el archivo (fila ${repetida})`,
        );
        errores.push(...v.errores);
        continue;
      }
      clavesVistas.set(clave, f.fila);

      if (!scopePorTipo.has(f.tipoPersonalId)) {
        try {
          await this.personalService.verificarScope(f.tipoPersonalId, actor);
          scopePorTipo.set(f.tipoPersonalId, true);
        } catch (error) {
          if (!esProhibido(error)) throw error;
          scopePorTipo.set(f.tipoPersonalId, false);
        }
      }
      if (!scopePorTipo.get(f.tipoPersonalId)) {
        v.error(
          'Tipo de personal',
          'No tiene asignado el frente de este tipo de personal',
        );
        errores.push(...v.errores);
        continue;
      }

      const existente = porClave.get(clave);
      if (!existente) {
        operaciones.push({
          accion: 'crear',
          ejecutar: async (manager) => {
            await manager.save(
              manager.create(PersonalCorte, {
                tipoPersonalId: f.tipoPersonalId,
                vigencia: f.vigencia,
                ...f.datos,
                // Obligatorio: la 1.ª pasada descarta filas sin Actual.
                actual: f.datos.actual!,
              }),
            );
          },
        });
        continue;
      }

      const cambios: Partial<PersonalCorte> = {};
      for (const [campo, valor] of Object.entries(f.datos)) {
        if (
          valor !== null &&
          valor !== existente[campo as keyof PersonalCorte]
        ) {
          (cambios as Record<string, unknown>)[campo] = valor;
        }
      }
      if (!Object.keys(cambios).length) {
        operaciones.push({ accion: 'sinCambios' });
        continue;
      }
      operaciones.push({
        accion: 'actualizar',
        ejecutar: async (manager) => {
          await manager.update(PersonalCorte, existente.id, cambios);
        },
      });
    }

    return { total: leidas.length, errores, operaciones };
  }

  private validarFechas(
    v: ValidadorFila,
    inicio: string | null,
    terminacion: string | null,
  ): void {
    // Mismo criterio que el CHECK proceso_fechas_ck.
    if (inicio && terminacion && terminacion < inicio) {
      v.error(
        'Fecha terminación',
        'La fecha de terminación es anterior a la de inicio',
      );
    }
  }
}
