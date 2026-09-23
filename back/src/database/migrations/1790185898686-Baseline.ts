// Migración baseline: ejecuta 001_core_schema.sql, 002_catalogos_base.sql,
// 003_core_views.sql y 100_seed_excel.sql en orden.
//
// IMPORTANTE — contra Supabase (producción) esas tablas YA EXISTEN (se
// aplicaron a mano en la Fase 1). Esta migración se registra ahí con
// `migration:run --fake`, NUNCA se corre de verdad contra esa conexión.
// Contra una BD de test vacía (docker-compose.test.yml) sí se ejecuta completa.
import { readFileSync } from 'fs';
import { join } from 'path';
import { MigrationInterface, QueryRunner } from 'typeorm';

const SQL_DIR = join(__dirname, 'sql');
const SEEDS_DIR = join(__dirname, '..', 'seeds', 'sql');

function leerSql(dir: string, archivo: string): string {
  return readFileSync(join(dir, archivo), 'utf8');
}

export class Baseline1790185898686 implements MigrationInterface {
  name = 'Baseline1790185898686';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // El driver `pg` soporta multi-statement en un solo query(), así que cada
    // archivo .sql (ya versionado y probado en Supabase) se ejecuta tal cual,
    // sin reescribirlo acá.
    await queryRunner.query(leerSql(SQL_DIR, '001_core_schema.sql'));
    await queryRunner.query(leerSql(SQL_DIR, '002_catalogos_base.sql'));
    await queryRunner.query(leerSql(SQL_DIR, '003_core_views.sql'));
    await queryRunner.query(leerSql(SEEDS_DIR, '100_seed_excel.sql'));
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // DESTRUCTIVO: borra todo el schema `core` con sus datos. Solo pensado
    // para resetear la BD de test local; jamás correr contra Supabase.
    await queryRunner.query('drop schema if exists core cascade');
  }
}
