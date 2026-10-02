// Estados de alerta, rutas del proceso, valor/ejecución, compromisos y vistas
// (ver sql/012_rutas_compromisos_estados.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class RutasCompromisosEstados1790300000006 implements MigrationInterface {
  name = 'RutasCompromisosEstados1790300000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('012_rutas_compromisos_estados.sql'));
  }

  // Vuelve las vistas a su definición anterior (005 y 004) antes de soltar
  // las columnas y tablas de las que dependen.
  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop view core.v_resumen_frente');
    await queryRunner.query('drop view core.v_proceso_detalle');
    // De la 005 solo la vista (el resto de ese archivo crea tablas que siguen ahí).
    const sql005 = leerSql('005_categoria_actividad.sql');
    await queryRunner.query(
      sql005.slice(sql005.indexOf('create or replace view')),
    );
    await queryRunner.query(
      leerSql('004_resumen_frente_total_actividades.sql'),
    );
    await queryRunner.query(`
      drop table core.compromiso;
      drop table core.proceso_ruta;
      drop table core.ruta_paso;
      drop table core.ruta;
      alter table core.proceso_contratacion
        drop column valor_contrato,
        drop column ejecucion_financiera;
      update core.estado_proceso set es_alerta = false where codigo = 'ALERTA_PRECONTRACTUAL';
      delete from core.estado_proceso where codigo in ('ALERTA_PROXIMO_TERMINAR', 'ALERTA_TERMINADO');
      update core.estado_proceso set orden = 7 where codigo = 'TERMINADO';
    `);
  }
}
