// Mapea la vista de solo lectura core.v_resumen_frente (003_core_views.sql).
// Ver nota sobre `expression` + synchronize:false en proceso-detalle.view-entity.ts.
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'v_resumen_frente',
  schema: 'core',
  expression: `
    select
      f.id,
      f.nombre,
      f.slug,
      f.descripcion,
      f.color,
      f.icono,
      f.orden,
      coalesce(pp.total_procesos, 0)       as total_procesos,
      coalesce(pp.precontractual, 0)       as precontractual,
      coalesce(pp.en_ejecucion, 0)         as en_ejecucion,
      coalesce(pp.terminados, 0)           as terminados,
      coalesce(pp.alertas, 0)              as alertas,
      coalesce(pp.proximos_vencer, 0)      as proximos_vencer,
      coalesce(pe.personal_actual, 0)      as personal_actual,
      coalesce(pe.personal_pendiente, 0)   as personal_pendiente
    from core.frente f
    left join lateral (
      select
        count(*)                                                     as total_procesos,
        count(*) filter (where v.fase = 'PRECONTRACTUAL')            as precontractual,
        count(*) filter (where v.fase = 'CONTRACTUAL')               as en_ejecucion,
        count(*) filter (where v.fase = 'POSCONTRACTUAL')            as terminados,
        count(*) filter (where v.es_alerta)                          as alertas,
        count(*) filter (where v.fase = 'CONTRACTUAL'
                           and v.dias_restantes between 0 and 30)    as proximos_vencer
      from core.frente_proceso fp
      join core.v_proceso_detalle v on v.id = fp.proceso_id
      where fp.frente_id = f.id
    ) pp on true
    left join lateral (
      select
        sum(pv.actual)                        as personal_actual,
        sum(greatest(pv.pendiente, 0))        as personal_pendiente
      from core.frente_tipo_personal ftp
      join core.v_personal_vigente pv on pv.tipo_personal_id = ftp.tipo_personal_id
      where ftp.frente_id = f.id
    ) pe on true
    where f.activo
  `,
})
export class VResumenFrente {
  @ViewColumn()
  id!: number;

  @ViewColumn()
  nombre!: string;

  @ViewColumn()
  slug!: string;

  @ViewColumn()
  descripcion!: string | null;

  @ViewColumn()
  color!: string;

  @ViewColumn()
  icono!: string;

  @ViewColumn()
  orden!: number;

  @ViewColumn({ name: 'total_procesos' })
  totalProcesos!: string;

  @ViewColumn()
  precontractual!: string;

  @ViewColumn({ name: 'en_ejecucion' })
  enEjecucion!: string;

  @ViewColumn()
  terminados!: string;

  @ViewColumn()
  alertas!: string;

  @ViewColumn({ name: 'proximos_vencer' })
  proximosVencer!: string;

  @ViewColumn({ name: 'personal_actual' })
  personalActual!: string;

  @ViewColumn({ name: 'personal_pendiente' })
  personalPendiente!: string;
}
