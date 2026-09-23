import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { Seguimiento } from '@/database/entities/seguimiento.entity';
import { FrenteProceso } from '@/database/entities/frente-proceso.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { ProcesosController } from './procesos.controller';
import { ProcesosService } from './procesos.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProcesoContratacion,
      Seguimiento,
      FrenteProceso,
      UsuarioFrente,
    ]),
  ],
  controllers: [ProcesosController],
  providers: [ProcesosService],
  exports: [ProcesosService],
})
export class ProcesosModule {}
