// Mapea la vista de solo lectura core.v_proceso_detalle (003_core_views.sql).
// `expression` es obligatorio para @ViewEntity pero, como TypeOrmModuleOptions
// tiene synchronize:false a nivel global, TypeORM nunca ejecuta este SQL para
// crear/reemplazar la vista real — solo documenta su definición. Se mantiene
// idéntico al archivo SQL para que no queden desincronizados.
import { ViewColumn, ViewEntity } from 'typeorm';
import { TipoProceso } from '../proceso-contratacion.entity';
import { FaseProceso } from '../estado-proceso.entity';

@ViewEntity({
  name: 'v_proceso_detalle',
  schema: 'core',
  expression: `
    select
      p.id,
      p.tipo,
      p.numero_contrato,
      p.numero_necesidad,
      p.fecha_inicio,
      p.fecha_terminacion,
      p.link_secop,
      p.observacion,
      p.proceso_supervisado_id,
      a.id            as actividad_id,
      a.nombre        as actividad,
      d.id            as dependencia_id,
      d.nombre        as dependencia,
      pr.id           as proyecto_id,
      pr.nombre       as proyecto,
      e.id            as estado_id,
      e.codigo        as estado_codigo,
      e.nombre        as estado,
      e.fase,
      e.es_alerta,
      e.color         as estado_color,
      c.id            as contratista_id,
      c.nombre        as contratista,
      (p.fecha_terminacion - current_date)                                  as dias_restantes,
      case
        when p.fecha_inicio is null or p.fecha_terminacion is null then null
        when p.fecha_terminacion = p.fecha_inicio then 100
        else greatest(0, least(100, round(
          100.0 * (current_date - p.fecha_inicio) / (p.fecha_terminacion - p.fecha_inicio))))::int
      end                                                                    as pct_plazo,
      ult.fecha       as ultima_nota_fecha,
      ult.nota        as ultima_nota,
      p.updated_at
    from core.proceso_contratacion p
    join core.actividad      a  on a.id  = p.actividad_id
    join core.dependencia    d  on d.id  = a.dependencia_id
    join core.proyecto       pr on pr.id = a.proyecto_id
    join core.estado_proceso e  on e.id  = p.estado_id
    left join core.contratista c on c.id = p.contratista_id
    left join lateral (
      select s.fecha, s.nota
      from core.seguimiento s
      where s.proceso_id = p.id
      order by s.fecha desc, s.id desc
      limit 1
    ) ult on true
  `,
})
export class VProcesoDetalle {
  @ViewColumn()
  id!: string;

  @ViewColumn()
  tipo!: TipoProceso;

  @ViewColumn({ name: 'numero_contrato' })
  numeroContrato!: string | null;

  @ViewColumn({ name: 'numero_necesidad' })
  numeroNecesidad!: string | null;

  @ViewColumn({ name: 'fecha_inicio' })
  fechaInicio!: string | null;

  @ViewColumn({ name: 'fecha_terminacion' })
  fechaTerminacion!: string | null;

  @ViewColumn({ name: 'link_secop' })
  linkSecop!: string | null;

  @ViewColumn()
  observacion!: string | null;

  @ViewColumn({ name: 'proceso_supervisado_id' })
  procesoSupervisadoId!: string | null;

  @ViewColumn({ name: 'actividad_id' })
  actividadId!: number;

  @ViewColumn()
  actividad!: string;

  @ViewColumn({ name: 'dependencia_id' })
  dependenciaId!: number;

  @ViewColumn()
  dependencia!: string;

  @ViewColumn({ name: 'proyecto_id' })
  proyectoId!: number;

  @ViewColumn()
  proyecto!: string;

  @ViewColumn({ name: 'estado_id' })
  estadoId!: number;

  @ViewColumn({ name: 'estado_codigo' })
  estadoCodigo!: string;

  @ViewColumn()
  estado!: string;

  @ViewColumn()
  fase!: FaseProceso;

  @ViewColumn({ name: 'es_alerta' })
  esAlerta!: boolean;

  @ViewColumn({ name: 'estado_color' })
  estadoColor!: string;

  @ViewColumn({ name: 'contratista_id' })
  contratistaId!: number | null;

  @ViewColumn()
  contratista!: string | null;

  @ViewColumn({ name: 'dias_restantes' })
  diasRestantes!: number | null;

  @ViewColumn({ name: 'pct_plazo' })
  pctPlazo!: number | null;

  @ViewColumn({ name: 'ultima_nota_fecha' })
  ultimaNotaFecha!: string | null;

  @ViewColumn({ name: 'ultima_nota' })
  ultimaNota!: string | null;

  @ViewColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
