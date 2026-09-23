import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Frente } from '@/database/entities/frente.entity';
import { VResumenFrente } from '@/database/entities/views/resumen-frente.view-entity';
import { VProcesoDetalle } from '@/database/entities/views/proceso-detalle.view-entity';
import { VPersonalVigente } from '@/database/entities/views/personal-vigente.view-entity';
import { FrenteProceso } from '@/database/entities/frente-proceso.entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { PersonalOperador } from '@/database/entities/personal-operador.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { FrentesController } from './frentes.controller';
import { FrentesService } from './frentes.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Frente,
      VResumenFrente,
      VProcesoDetalle,
      VPersonalVigente,
      FrenteProceso,
      FrenteTipoPersonal,
      PersonalCorte,
      PersonalOperador,
      ProcesoContratacion,
    ]),
  ],
  controllers: [FrentesController],
  providers: [FrentesService],
})
export class FrentesModule {}
