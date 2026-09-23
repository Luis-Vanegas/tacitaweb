// Mapea core.personal_operador (001_core_schema.sql). Operadores de un corte
// (ej. "UdeA (199) / ITM (16)").
import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { PersonalCorte } from './personal-corte.entity';
import { Contratista } from './contratista.entity';
import { ProcesoContratacion } from './proceso-contratacion.entity';

@Entity({ name: 'personal_operador' })
export class PersonalOperador {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'bigint', name: 'corte_id' })
  corteId!: string;

  @Column({ type: 'integer', name: 'contratista_id' })
  contratistaId!: number;

  @Column({ type: 'integer', nullable: true })
  cantidad!: number | null;

  @Column({ type: 'date', name: 'fecha_final', nullable: true })
  fechaFinal!: string | null;

  @Column({ type: 'bigint', name: 'proceso_id', nullable: true })
  procesoId!: string | null;

  @ManyToOne(() => PersonalCorte, (corte) => corte.operadores, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'corte_id' })
  corte!: PersonalCorte;

  @ManyToOne(() => Contratista, (contratista) => contratista.operaciones, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'contratista_id' })
  contratista!: Contratista;

  @ManyToOne(() => ProcesoContratacion, (proceso) => proceso.operaciones, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'proceso_id' })
  proceso!: ProcesoContratacion | null;
}
