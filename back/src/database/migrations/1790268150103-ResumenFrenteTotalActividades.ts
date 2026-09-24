// Agrega total_actividades a v_resumen_frente (ver
// sql/004_resumen_frente_total_actividades.sql). A diferencia del Baseline,
// esta SÍ se ejecuta de verdad contra Supabase: es un create or replace view
// sobre una vista que ya existe, no una tabla nueva.
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');

function leerSql(archivo: string): string {
  return readFileSync(join(SQL_DIR, archivo), 'utf8');
}

export class ResumenFrenteTotalActividades1790268150103 implements MigrationInterface {
  name = 'ResumenFrenteTotalActividades1790268150103';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      leerSql('004_resumen_frente_total_actividades.sql'),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Vuelve a la definición anterior de la vista (003_core_views.sql), sin
    // total_actividades.
    await queryRunner.query(leerSql('003_core_views.sql'));
  }
}
