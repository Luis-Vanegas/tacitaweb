// Actividades nuevas de EMVARIAS sin contrato todavía (ver
// sql/007_actividades_emvarias.sql para el porqué de la dependencia dedicada).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class ActividadesEmvarias1790300000001 implements MigrationInterface {
  name = 'ActividadesEmvarias1790300000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('007_actividades_emvarias.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      delete from core.frente_proceso fp
      using core.proceso_contratacion p, core.actividad a, core.dependencia d
      where fp.proceso_id = p.id and p.actividad_id = a.id
        and a.dependencia_id = d.id and d.slug = 'emvarias';

      delete from core.proceso_contratacion p
      using core.actividad a, core.dependencia d
      where p.actividad_id = a.id and a.dependencia_id = d.id and d.slug = 'emvarias';

      delete from core.actividad a
      using core.dependencia d
      where a.dependencia_id = d.id and d.slug = 'emvarias';

      delete from core.dependencia where slug = 'emvarias';
    `);
  }
}
