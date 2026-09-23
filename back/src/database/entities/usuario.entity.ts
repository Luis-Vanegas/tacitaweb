// Mapea core.usuario (001_core_schema.sql). Auth propia (JWT + bcrypt); solo
// se guarda el hash, nunca la contraseña en claro.
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioFrente } from './usuario-frente.entity';

// Coincide con el CHECK de core.usuario.rol.
export enum RolUsuario {
  ADMIN = 'ADMIN',
  EDITOR = 'EDITOR',
  LECTOR = 'LECTOR',
}

@Entity({ name: 'usuario' })
export class Usuario {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  email!: string;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'text', name: 'password_hash', select: false })
  passwordHash!: string;

  @Column({
    type: 'varchar',
    length: 10,
    enum: RolUsuario,
    default: RolUsuario.LECTOR,
  })
  rol!: RolUsuario;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @Column({ type: 'timestamptz', name: 'ultimo_acceso', nullable: true })
  ultimoAcceso!: Date | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UsuarioFrente, (usuarioFrente) => usuarioFrente.usuario)
  frentes!: UsuarioFrente[];
}
