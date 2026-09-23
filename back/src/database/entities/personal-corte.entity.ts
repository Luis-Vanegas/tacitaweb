// Mapea core.personal_corte (001_core_schema.sql). Foto del personal por
// vigencia ("Cifras actualizadas 2025/2026").
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
import { TipoPersonal } from './tipo-personal.entity';
import { PersonalOperador } from './personal-operador.entity';

@Entity({ name: 'personal_corte' })
export class PersonalCorte {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'integer', name: 'tipo_personal_id' })
  tipoPersonalId!: number;

  @Column({ type: 'smallint' })
  vigencia!: number;

  @Column({ type: 'integer' })
  actual!: number;

  // Digitado (2026). En 2025 era fórmula meta-actual: se deja nulo y se
  // calcula en core.v_personal_vigente.
  @Column({ type: 'integer', nullable: true })
  pendiente!: number | null;

  @Column({ type: 'integer', nullable: true })
  meta!: number | null;

  @Column({ type: 'date', name: 'fecha_final', nullable: true })
  fechaFinal!: string | null;

  @Column({ type: 'text', nullable: true })
  observaciones!: string | null;

  @Column({ type: 'text', array: true, name: 'links_secop', default: '{}' })
  linksSecop!: string[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => TipoPersonal, (tipoPersonal) => tipoPersonal.cortes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_personal_id' })
  tipoPersonal!: TipoPersonal;

  @OneToMany(() => PersonalOperador, (operador) => operador.corte)
  operadores!: PersonalOperador[];
}
