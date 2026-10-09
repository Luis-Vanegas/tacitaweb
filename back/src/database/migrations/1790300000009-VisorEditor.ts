// El usuario "Visor" de la demo pasa a EDITOR con todos los frentes
// (ver sql/015_visor_editor.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class VisorEditor1790300000009 implements MigrationInterface {
  name = 'VisorEditor1790300000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('015_visor_editor.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      delete from core.usuario_frente uf
      using core.usuario u
      where uf.usuario_id = u.id and u.nombre = 'Visor';
      update core.usuario set rol = 'LECTOR' where nombre = 'Visor' and rol = 'EDITOR';
    `);
  }
}
