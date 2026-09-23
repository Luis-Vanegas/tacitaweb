// Mapea core.frente_proceso (001_core_schema.sql). Relación N:M frente↔proceso,
// con el criterio (trazabilidad) de por qué el proceso está en ese frente.
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Frente } from './frente.entity';
import { ProcesoContratacion } from './proceso-contratacion.entity';

// Coincide con el CHECK de core.frente_proceso.criterio.
export enum CriterioFrenteProceso {
  DEPENDENCIA = 'DEPENDENCIA',
  CONTRATISTA = 'CONTRATISTA',
  ACTIVIDAD = 'ACTIVIDAD',
  MANUAL = 'MANUAL',
}

@Entity({ name: 'frente_proceso' })
export class FrenteProceso {
  @PrimaryColumn({ type: 'smallint', name: 'frente_id' })
  frenteId!: number;

  @PrimaryColumn({ type: 'bigint', name: 'proceso_id' })
  procesoId!: string;

  @Column({
    type: 'varchar',
    length: 15,
    enum: CriterioFrenteProceso,
    default: CriterioFrenteProceso.MANUAL,
  })
  criterio!: CriterioFrenteProceso;

  @Column({ type: 'text', nullable: true })
  nota!: string | null;

  @ManyToOne(() => Frente, (frente) => frente.procesos, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'frente_id' })
  frente!: Frente;

  @ManyToOne(() => ProcesoContratacion, (proceso) => proceso.frentes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'proceso_id' })
  proceso!: ProcesoContratacion;
}
