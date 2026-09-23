// Mapea la vista de solo lectura core.v_personal_vigente (003_core_views.sql).
// Ver nota sobre `expression` + synchronize:false en proceso-detalle.view-entity.ts.
import { ViewColumn, ViewEntity } from 'typeorm';

@ViewEntity({
  name: 'v_personal_vigente',
  schema: 'core',
  expression: `
    select distinct on (pc.tipo_personal_id)
      pc.id               as corte_id,
      tp.id               as tipo_personal_id,
      tp.nombre           as tipo_personal,
      tp.dependencia_id,
      pc.vigencia,
      pc.actual,
      coalesce(pc.pendiente, pc.meta - pc.actual) as pendiente,
      pc.meta,
      pc.fecha_final,
      pc.observaciones,
      pc.links_secop
    from core.personal_corte pc
    join core.tipo_personal tp on tp.id = pc.tipo_personal_id
    where tp.activo
    order by pc.tipo_personal_id, pc.vigencia desc
  `,
})
export class VPersonalVigente {
  @ViewColumn({ name: 'corte_id' })
  corteId!: string;

  @ViewColumn({ name: 'tipo_personal_id' })
  tipoPersonalId!: number;

  @ViewColumn({ name: 'tipo_personal' })
  tipoPersonal!: string;

  @ViewColumn({ name: 'dependencia_id' })
  dependenciaId!: number | null;

  @ViewColumn()
  vigencia!: number;

  @ViewColumn()
  actual!: number;

  @ViewColumn()
  pendiente!: number | null;

  @ViewColumn()
  meta!: number | null;

  @ViewColumn({ name: 'fecha_final' })
  fechaFinal!: string | null;

  @ViewColumn()
  observaciones!: string | null;

  @ViewColumn({ name: 'links_secop' })
  linksSecop!: string[];
}
