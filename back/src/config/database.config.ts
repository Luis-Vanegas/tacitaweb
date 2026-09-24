// Factory de conexión TypeORM. La BD (schema `core`) ya existe en Supabase:
// synchronize siempre en false, todo cambio de esquema pasa por una migración.
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { EnvironmentVariables } from './env.validation';
import { Dependencia } from '@/database/entities/dependencia.entity';
import { Usuario } from '@/database/entities/usuario.entity';
import { Contratista } from '@/database/entities/contratista.entity';
import { CategoriaActividad } from '@/database/entities/categoria-actividad.entity';
import { Auditoria } from '@/database/entities/auditoria.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { Actividad } from '@/database/entities/actividad.entity';
import { TipoPersonal } from '@/database/entities/tipo-personal.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { EstadoProceso } from '@/database/entities/estado-proceso.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { FrenteProceso } from '@/database/entities/frente-proceso.entity';
import { Proyecto } from '@/database/entities/proyecto.entity';
import { PersonalOperador } from '@/database/entities/personal-operador.entity';
import { Seguimiento } from '@/database/entities/seguimiento.entity';
import { Frente } from '@/database/entities/frente.entity';
import { VResumenFrente } from '@/database/entities/views/resumen-frente.view-entity';
import { VProcesoDetalle } from '@/database/entities/views/proceso-detalle.view-entity';
import { VPersonalVigente } from '@/database/entities/views/personal-vigente.view-entity';

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
    // Lista explícita de clases (no glob de archivos): en el bundle de
    // Netlify Functions todo dist/ queda concatenado en un único api.js, asi
    // que un glob tipo dist/**/*.entity.js no encuentra ningun archivo suelto
    // en el filesystem del runtime y TypeORM arranca sin entidades
    // registradas (error real: EntityMetadataNotFoundError).
    entities: [
      Dependencia,
      Usuario,
      Contratista,
      CategoriaActividad,
      Auditoria,
      UsuarioFrente,
      Actividad,
      TipoPersonal,
      PersonalCorte,
      FrenteTipoPersonal,
      EstadoProceso,
      ProcesoContratacion,
      FrenteProceso,
      Proyecto,
      PersonalOperador,
      Seguimiento,
      Frente,
      VResumenFrente,
      VProcesoDetalle,
      VPersonalVigente,
    ],
    // Las migraciones solo corren desde el CLI local (migration:run con
    // data-source.ts), nunca en el arranque de la app -> el glob acá es
    // inofensivo, no se evalua en el runtime de la funcion serverless.
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    autoLoadEntities: false,
  };
}
