// DataSource standalone para la CLI de TypeORM (migration:run/revert/generate).
// No pasa por Nest: carga el .env directamente con dotenv antes de leer
// process.env. Usa rutas relativas (no el alias @/) porque la CLI corre con
// ts-node sin el registro de tsconfig-paths.
import 'dotenv/config';
import { DataSource } from 'typeorm';

const DATABASE_SSL = process.env.DATABASE_SSL === 'true';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL no está definida (revisa back/.env).');
}

const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  schema: 'core',
  synchronize: false,
  ssl: DATABASE_SSL ? { rejectUnauthorized: false } : false,
  migrationsTableName: 'typeorm_migrations',
  migrationsTransactionMode: 'each',
  entities: [
    `${__dirname}/entities/*.entity.{ts,js}`,
    `${__dirname}/entities/views/*.view-entity.{ts,js}`,
  ],
  migrations: [`${__dirname}/migrations/*.{ts,js}`],
});

export default AppDataSource;
