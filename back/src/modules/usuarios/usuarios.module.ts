import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '@/database/entities/usuario.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, UsuarioFrente])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
