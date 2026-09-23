// Mapea core.dependencia (001_core_schema.sql). Secretaría responsable de los
// procesos (columna "Dependencia" del Excel).
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Actividad } from './actividad.entity';
import { TipoPersonal } from './tipo-personal.entity';

@Entity({ name: 'dependencia' })
export class Dependencia {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'varchar', length: 12, nullable: true })
  sigla!: string | null;

  @Column({ type: 'varchar', length: 60, unique: true })
  slug!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Actividad, (actividad) => actividad.dependencia)
  actividades!: Actividad[];

  @OneToMany(() => TipoPersonal, (tipoPersonal) => tipoPersonal.dependencia)
  tiposPersonal!: TipoPersonal[];
}
