// Mapea core.compromiso (012_rutas_compromisos_estados.sql): compromisos del
// proyecto en general (hoja "Compromisos" del Excel), no ligados a un frente.
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type EstadoCompromiso = 'PENDIENTE' | 'EN_GESTION' | 'CUMPLIDO';

@Entity({ name: 'compromiso' })
export class Compromiso {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'varchar', length: 12 })
  estado!: EstadoCompromiso;

  @Column({ type: 'text', nullable: true })
  responsable!: string | null;

  @Column({ name: 'fecha_registro', type: 'date', nullable: true })
  fechaRegistro!: string | null;

  @Column({ name: 'fecha_cumplimiento', type: 'date', nullable: true })
  fechaCumplimiento!: string | null;

  @Column({ type: 'text', nullable: true })
  avance!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
