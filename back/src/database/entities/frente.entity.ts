// Mapea core.frente (001_core_schema.sql). Los 7 frentes del menú principal.
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UsuarioFrente } from './usuario-frente.entity';
import { FrenteProceso } from './frente-proceso.entity';
import { FrenteTipoPersonal } from './frente-tipo-personal.entity';

@Entity({ name: 'frente' })
export class Frente {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug!: string;

  @Column({ type: 'text', nullable: true })
  descripcion!: string | null;

  @Column({ type: 'varchar', length: 7 })
  color!: string;

  @Column({ type: 'varchar', length: 40 })
  icono!: string;

  @Column({ type: 'smallint', unique: true })
  orden!: number;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => UsuarioFrente, (usuarioFrente) => usuarioFrente.frente)
  usuarios!: UsuarioFrente[];

  @OneToMany(() => FrenteProceso, (frenteProceso) => frenteProceso.frente)
  procesos!: FrenteProceso[];

  @OneToMany(
    () => FrenteTipoPersonal,
    (frenteTipoPersonal) => frenteTipoPersonal.frente,
  )
  tiposPersonal!: FrenteTipoPersonal[];
}
