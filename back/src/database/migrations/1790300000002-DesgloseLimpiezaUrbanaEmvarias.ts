// Desglose de sub-actividades de "Limpieza urbana" (EMVARIAS), guardado en
// observación del proceso placeholder (ver
// sql/008_desglose_limpieza_urbana_emvarias.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class DesgloseLimpiezaUrbanaEmvarias1790300000002 implements MigrationInterface {
  name = 'DesgloseLimpiezaUrbanaEmvarias1790300000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      leerSql('008_desglose_limpieza_urbana_emvarias.sql'),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update core.proceso_contratacion p
      set observacion = null
      from core.actividad a
      join core.dependencia d on d.id = a.dependencia_id and d.slug = 'emvarias'
      where p.actividad_id = a.id and a.nombre = 'Limpieza urbana';
    `);
  }
}
