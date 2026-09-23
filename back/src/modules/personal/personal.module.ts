import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonalCorte } from '@/database/entities/personal-corte.entity';
import { FrenteTipoPersonal } from '@/database/entities/frente-tipo-personal.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { PersonalController } from './personal.controller';
import { PersonalService } from './personal.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PersonalCorte,
      FrenteTipoPersonal,
      UsuarioFrente,
    ]),
  ],
  controllers: [PersonalController],
  providers: [PersonalService],
})
export class PersonalModule {}
