// EMVARIAS muestra solo las actividades del documento "RESUMEN CLUS" (ver
// sql/010_emvarias_solo_actividades_word.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class EmvariasSoloActividadesWord1790300000004 implements MigrationInterface {
  name = 'EmvariasSoloActividadesWord1790300000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('010_emvarias_solo_actividades_word.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      insert into core.frente_proceso (frente_id, proceso_id, criterio)
      select f.id, p.id, 'CONTRATISTA'
      from core.proceso_contratacion p
      join core.frente f on f.slug = 'emvarias'
      where p.id in (2, 3, 9, 20, 21)
      on conflict do nothing;
    `);
  }
}
