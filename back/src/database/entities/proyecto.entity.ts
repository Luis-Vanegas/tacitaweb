// Mapea core.proyecto (001_core_schema.sql). Proyectos estratégicos (hoja "Lista").
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Actividad } from './actividad.entity';

@Entity({ name: 'proyecto' })
export class Proyecto {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => Actividad, (actividad) => actividad.proyecto)
  actividades!: Actividad[];
}
