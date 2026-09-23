// Mapea core.actividad (001_core_schema.sql). Línea de trabajo de una
// dependencia; agrupa la historia de sus procesos de contratación.
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Dependencia } from './dependencia.entity';
import { Proyecto } from './proyecto.entity';
import { ProcesoContratacion } from './proceso-contratacion.entity';

@Entity({ name: 'actividad' })
export class Actividad {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'integer', name: 'dependencia_id' })
  dependenciaId!: number;

  @Column({ type: 'integer', name: 'proyecto_id' })
  proyectoId!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  // ON DELETE RESTRICT en la BD: no se permite borrar la dependencia si tiene actividades.
  @ManyToOne(() => Dependencia, (dependencia) => dependencia.actividades, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'dependencia_id' })
  dependencia!: Dependencia;

  @ManyToOne(() => Proyecto, (proyecto) => proyecto.actividades, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'proyecto_id' })
  proyecto!: Proyecto;

  @OneToMany(() => ProcesoContratacion, (proceso) => proceso.actividad)
  procesos!: ProcesoContratacion[];
}
