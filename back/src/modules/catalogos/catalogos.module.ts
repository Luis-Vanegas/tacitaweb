import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EstadoProceso } from '@/database/entities/estado-proceso.entity';
import { Dependencia } from '@/database/entities/dependencia.entity';
import { Proyecto } from '@/database/entities/proyecto.entity';
import { Contratista } from '@/database/entities/contratista.entity';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      EstadoProceso,
      Dependencia,
      Proyecto,
      Contratista,
    ]),
  ],
  controllers: [CatalogosController],
  providers: [CatalogosService],
})
export class CatalogosModule {}
