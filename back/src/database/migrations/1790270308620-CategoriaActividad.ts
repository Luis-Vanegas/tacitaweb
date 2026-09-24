// Catálogo de categorías temáticas de actividad + su columna en core.actividad
// + v_proceso_detalle actualizada (ver sql/005_categoria_actividad.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class CategoriaActividad1790270308620 implements MigrationInterface {
  name = 'CategoriaActividad1790270308620';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('005_categoria_actividad.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vuelve v_proceso_detalle a la definición anterior (sin categoría), sin
    // tocar v_resumen_frente (esa la toca la migración 004, no esta).
    await queryRunner.query(`
      create or replace view core.v_proceso_detalle
      with (security_invoker = true) as
      select
        p.id, p.tipo, p.numero_contrato, p.numero_necesidad, p.fecha_inicio,
        p.fecha_terminacion, p.link_secop, p.observacion, p.proceso_supervisado_id,
        a.id as actividad_id, a.nombre as actividad,
        d.id as dependencia_id, d.nombre as dependencia,
        pr.id as proyecto_id, pr.nombre as proyecto,
        e.id as estado_id, e.codigo as estado_codigo, e.nombre as estado,
        e.fase, e.es_alerta, e.color as estado_color,
        c.id as contratista_id, c.nombre as contratista,
        (p.fecha_terminacion - current_date) as dias_restantes,
        case
          when p.fecha_inicio is null or p.fecha_terminacion is null then null
          when p.fecha_terminacion = p.fecha_inicio then 100
          else greatest(0, least(100, round(
            100.0 * (current_date - p.fecha_inicio) / (p.fecha_terminacion - p.fecha_inicio))))::int
        end as pct_plazo,
        ult.fecha as ultima_nota_fecha, ult.nota as ultima_nota, p.updated_at
      from core.proceso_contratacion p
      join core.actividad a on a.id = p.actividad_id
      join core.dependencia d on d.id = a.dependencia_id
      join core.proyecto pr on pr.id = a.proyecto_id
      join core.estado_proceso e on e.id = p.estado_id
      left join core.contratista c on c.id = p.contratista_id
      left join lateral (
        select s.fecha, s.nota from core.seguimiento s
        where s.proceso_id = p.id order by s.fecha desc, s.id desc limit 1
      ) ult on true;
    `);
    await queryRunner.query(
      'alter table core.actividad drop column categoria_id',
    );
    await queryRunner.query('drop table core.categoria_actividad');
  }
}
