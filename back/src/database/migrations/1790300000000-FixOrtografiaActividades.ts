// Corrige errores de tipeo en 3 nombres de actividad heredados del Excel
// (ver sql/006_fix_ortografia_actividades.sql).
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class FixOrtografiaActividades1790300000000 implements MigrationInterface {
  name = 'FixOrtografiaActividades1790300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(leerSql('006_fix_ortografia_actividades.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      update core.actividad
      set nombre = 'Operación logística (camapaña Tu sepaara yo reciclo)'
      where nombre = 'Operación logística (campaña Tu separas yo reciclo)';

      update core.actividad
      set nombre = 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin'
      where nombre = 'Interventoría a las Obras de construcción y mejoramiento de espacios públicos en el centro de Medellín';

      update core.actividad
      set nombre = 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellin'
      where nombre = 'Obras de construcción y mejoramiento de espacios públicos en el centro de Medellín';
    `);
  }
}
