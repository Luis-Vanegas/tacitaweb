import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { Frente } from '@/database/entities/frente.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { CatalogosModule } from '../catalogos/catalogos.module';
import { ProcesosModule } from '../procesos/procesos.module';
import { PersonalModule } from '../personal/personal.module';
import { ImportacionController } from './importacion.controller';
import { ImportacionService } from './importacion.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcesoContratacion,
      PersonalCorte,
      Frente,
      UsuarioFrente,
    ]),
    CatalogosModule,
    ProcesosModule,
    PersonalModule,
  ],
  controllers: [ImportacionController],
  providers: [ImportacionService],
})
export class ImportacionModule {}
