// Valida las variables de entorno al arrancar el server (falla rápido si falta algo).
// Se engancha en ConfigModule.forRoot({ validate }) en app.module.ts.
import { plainToInstance } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MinLength,
  validateSync,
} from 'class-validator';

export class EnvironmentVariables {
  // Cadena de conexión completa a Postgres (Supabase → Connect → Session pooler).
  @IsUrl(
    {
      protocols: ['postgres', 'postgresql'],
      require_protocol: true,
      require_tld: false,
    },
    { message: 'DATABASE_URL debe ser una URL postgres:// válida' },
  )
  DATABASE_URL!: string;

  // Supabase requiere TLS; se activa/desactiva explícitamente por entorno
  // (false en Postgres local de docker-compose.test.yml).
  @IsBoolean({ message: 'DATABASE_SSL debe ser "true" o "false"' })
  DATABASE_SSL!: boolean;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET debe tener al menos 32 caracteres' })
  JWT_SECRET!: string;

  @IsString()
  @MinLength(32, {
    message: 'JWT_REFRESH_SECRET debe tener al menos 32 caracteres',
  })
  JWT_REFRESH_SECRET!: string;

  // Lista blanca de orígenes permitidos por CORS (uno o varios separados por coma).
  @IsString()
  @IsNotEmpty({ message: 'CORS_ORIGIN no puede estar vacío' })
  CORS_ORIGIN!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT?: number = 3000;
}

// class-validator no castea "true"/"false" ni strings numéricos por sí solo;
// se transforman a mano antes de instanciar para que @IsBoolean/@IsInt no fallen.
export function validate(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const normalized: Record<string, unknown> = { ...config };

  if (typeof normalized.DATABASE_SSL === 'string') {
    normalized.DATABASE_SSL = normalized.DATABASE_SSL === 'true';
  }
  if (typeof normalized.PORT === 'string' && normalized.PORT.trim() !== '') {
    normalized.PORT = Number(normalized.PORT);
  }

  const validatedConfig = plainToInstance(EnvironmentVariables, normalized, {
    enableImplicitConversion: false,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const mensajes = errors
      .flatMap((error) => Object.values(error.constraints ?? {}))
      .join('; ');
    throw new Error(`Configuración de entorno inválida: ${mensajes}`);
  }

  return validatedConfig;
}
