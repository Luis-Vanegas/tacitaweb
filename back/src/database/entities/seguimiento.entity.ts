// Mapea core.seguimiento (001_core_schema.sql). Bitácora del proceso (notas
// fechadas); cada cambio de estado desde la app debe crear una fila aquí.
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ProcesoContratacion } from './proceso-contratacion.entity';
import { EstadoProceso } from './estado-proceso.entity';
import { Usuario } from './usuario.entity';

// Coincide con el CHECK de core.seguimiento.origen.
export enum OrigenSeguimiento {
  EXCEL = 'EXCEL',
  APP = 'APP',
}

@Entity({ name: 'seguimiento' })
export class Seguimiento {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', name: 'proceso_id' })
  procesoId!: string;

  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'text' })
  nota!: string;

  @Column({ type: 'smallint', name: 'estado_id', nullable: true })
  estadoId!: number | null;

  @Column({ type: 'uuid', name: 'autor_id', nullable: true })
  autorId!: string | null;

  @Column({
    type: 'varchar',
    length: 10,
    enum: OrigenSeguimiento,
    default: OrigenSeguimiento.APP,
  })
  origen!: OrigenSeguimiento;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @ManyToOne(() => ProcesoContratacion, (proceso) => proceso.seguimientos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proceso_id' })
  proceso!: ProcesoContratacion;

  @ManyToOne(() => EstadoProceso, (estado) => estado.seguimientos, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'estado_id' })
  estado!: EstadoProceso | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'autor_id' })
  autor!: Usuario | null;
}
