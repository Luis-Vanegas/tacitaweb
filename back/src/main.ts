import './register-paths';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(helmet());

  // CORS_ORIGIN es una lista blanca separada por comas (validada al arrancar
  // en config/env.validation.ts); `credentials: true` porque el refresh
  // token viaja en una cookie httpOnly.
  const origenesPermitidos = (process.env.CORS_ORIGIN ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  app.enableCors({ origin: origenesPermitidos, credentials: true });

  // whitelist+forbidNonWhitelisted: cualquier campo que no esté en el DTO
  // rompe la request en vez de pasar silencioso; transform: los query params
  // llegan como string y los DTOs con @Type(() => Number) los castean.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Contrato de la API (docs/PLAN-IMPLEMENTACION.md §2): todo bajo /api/v1.
  app.setGlobalPrefix('api/v1');
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
