import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Usuario } from '@/database/entities/usuario.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [TypeOrmModule.forFeature([Usuario, UsuarioFrente])],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
