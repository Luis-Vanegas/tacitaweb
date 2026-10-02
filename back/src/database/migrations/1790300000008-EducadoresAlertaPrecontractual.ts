// Educadores (Inclusión Social) pasa a "Alerta precontractual"
// (ver sql/014_educadores_alerta_precontractual.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class EducadoresAlertaPrecontractual1790300000008 implements MigrationInterface {
  name = 'EducadoresAlertaPrecontractual1790300000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('014_educadores_alerta_precontractual.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update core.proceso_contratacion p
      set estado_id = (select id from core.estado_proceso where codigo = 'PRECONTRACTUAL')
      from core.actividad a
      where p.actividad_id = a.id and a.nombre = 'Educadores' and p.numero_contrato is null
        and p.estado_id = (select id from core.estado_proceso where codigo = 'ALERTA_PRECONTRACTUAL');
    `);
  }
}
