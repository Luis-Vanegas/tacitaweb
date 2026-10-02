// Sincroniza contratos, rutas, personal 2026 y compromisos con el Excel (8)
// (ver sql/013_actualizacion_excel_8.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class ActualizacionExcel81790300000007 implements MigrationInterface {
  name = 'ActualizacionExcel81790300000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('013_actualizacion_excel_8.sql'));
  }

  // ponytail: sin down de datos (igual que 009): revertir cifras y estados a
  // mano no es seguro; si hace falta, el down de la 006 suelta rutas y
  // compromisos completos.
  public async down(): Promise<void> {}
}
