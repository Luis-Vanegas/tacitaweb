import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoProceso } from '@/database/entities/estado-proceso.entity';
import { Dependencia } from '@/database/entities/dependencia.entity';
import { Proyecto } from '@/database/entities/proyecto.entity';
import { Contratista } from '@/database/entities/contratista.entity';
import { CategoriaActividad } from '@/database/entities/categoria-actividad.entity';
import { TipoPersonal } from '@/database/entities/tipo-personal.entity';
import { Actividad } from '@/database/entities/actividad.entity';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstadoProceso,
      Dependencia,
      Proyecto,
      Contratista,
      CategoriaActividad,
      TipoPersonal,
      Actividad,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
