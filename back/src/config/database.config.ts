// Factory de conexión TypeORM. La BD (schema `core`) ya existe en Supabase:
// synchronize siempre en false, todo cambio de esquema pasa por una migración.
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvironmentVariables } from './env.validation';

export function databaseConfig(
  configService: ConfigService<EnvironmentVariables, true>,
): TypeOrmModuleOptions {
  const ssl = configService.get('DATABASE_SSL', { infer: true });

  return {
    type: 'postgres',
    url: configService.get('DATABASE_URL', { infer: true }),
    schema: 'core',
    synchronize: false,
    // Supabase (pooler) termina TLS con un certificado que no siempre valida
    // la cadena completa desde el cliente; rejectUnauthorized:false es lo
    // recomendado por Supabase para conexiones server-to-server por pooler.
    ssl: ssl ? { rejectUnauthorized: false } : false,
    migrationsTableName: 'typeorm_migrations',
    migrationsTransactionMode: 'each',
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    autoLoadEntities: false,
  };
}
