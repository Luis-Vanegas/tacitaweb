import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { validate, EnvironmentVariables } from './config/env.validation';
import { databaseConfig } from './config/database.config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsuariosModule } from './modules/usuarios/usuarios.module';
import { CatalogosModule } from './modules/catalogos/catalogos.module';
import { FrentesModule } from './modules/frentes/frentes.module';
import { ProcesosModule } from './modules/procesos/procesos.module';
import { SeguimientoModule } from './modules/seguimiento/seguimiento.module';
import { PersonalModule } from './modules/personal/personal.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvironmentVariables, true>) =>
        databaseConfig(configService),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (
        configService: ConfigService<EnvironmentVariables, true>,
      ) => ({
        secret: configService.get('JWT_SECRET', { infer: true }),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    HealthModule,
    AuthModule,
    UsuariosModule,
    CatalogosModule,
    FrentesModule,
    ProcesosModule,
    SeguimientoModule,
    PersonalModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // Global: toda ruta requiere JWT válido salvo que tenga @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global: mapea errores de Postgres (unique/FK/check) a códigos HTTP.
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
