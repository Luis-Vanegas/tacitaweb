import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seguimiento } from '@/database/entities/seguimiento.entity';
import { ProcesoContratacion } from '@/database/entities/proceso-contratacion.entity';
import { FrenteProceso } from '@/database/entities/frente-proceso.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { SeguimientoController } from './seguimiento.controller';
import { SeguimientoService } from './seguimiento.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Seguimiento,
      ProcesoContratacion,
      FrenteProceso,
      UsuarioFrente,
    ]),
  ],
  controllers: [SeguimientoController],
  providers: [SeguimientoService],
})
export class SeguimientoModule {}
