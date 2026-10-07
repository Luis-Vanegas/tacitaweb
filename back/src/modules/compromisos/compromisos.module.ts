import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Compromiso } from '@/database/entities/compromiso.entity';
import { CompromisosController } from './compromisos.controller';
import { CompromisosService } from './compromisos.service';

@Module({
  imports: [TypeOrmModule.forFeature([Compromiso])],
  controllers: [CompromisosController],
  providers: [CompromisosService],
})
export class CompromisosModule {}
