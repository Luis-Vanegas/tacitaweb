// Mapea core.estado_proceso (001_core_schema.sql). Estados del ciclo de vida
// del proceso, ordenados para el stepper del front.
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { ProcesoContratacion } from './proceso-contratacion.entity';
import { Seguimiento } from './seguimiento.entity';

// Coincide con el CHECK de core.estado_proceso.fase.
export enum FaseProceso {
  PRECONTRACTUAL = 'PRECONTRACTUAL',
  CONTRACTUAL = 'CONTRACTUAL',
  POSCONTRACTUAL = 'POSCONTRACTUAL',
}

@Entity({ name: 'estado_proceso' })
export class EstadoProceso {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 40, unique: true })
  codigo!: string;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, enum: FaseProceso })
  fase!: FaseProceso;

  @Column({ type: 'smallint', unique: true })
  orden!: number;

  @Column({ type: 'boolean', default: false, name: 'es_alerta' })
  esAlerta!: boolean;

  @Column({ type: 'varchar', length: 7 })
  color!: string;

  @OneToMany(() => ProcesoContratacion, (proceso) => proceso.estado)
  procesos!: ProcesoContratacion[];

  @OneToMany(() => Seguimiento, (seguimiento) => seguimiento.estado)
  seguimientos!: Seguimiento[];
}
