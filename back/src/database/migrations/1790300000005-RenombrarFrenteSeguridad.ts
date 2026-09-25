// Renombra el frente "Operativa / Seguridad" a "Seguridad" (ver
// sql/011_renombrar_frente_seguridad.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class RenombrarFrenteSeguridad1790300000005 implements MigrationInterface {
  name = 'RenombrarFrenteSeguridad1790300000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('011_renombrar_frente_seguridad.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update core.frente
      set nombre = 'Operativa / Seguridad'
      where slug = 'operativa-seguridad';
    `);
  }
}
