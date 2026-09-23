import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { RolUsuario } from '@/database/entities/usuario.entity';

export class CrearUsuarioDto {
  @IsEmail({}, { message: 'email inválido' })
  email!: string;

  @IsString()
  @MinLength(1)
  nombre!: string;

  @IsString()
  @MinLength(8, { message: 'password debe tener al menos 8 caracteres' })
  password!: string;

  @IsEnum(RolUsuario)
  rol!: RolUsuario;

  @IsOptional()
  @IsBoolean()
  activo?: boolean;

  // ids de core.frente asignados (solo aplica a EDITOR).
  @IsOptional()
  @IsArray()
  @IsInt({ each: true })
  frentes?: number[];
}
