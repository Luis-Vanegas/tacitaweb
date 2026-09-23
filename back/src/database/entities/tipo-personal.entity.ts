// Mapea core.tipo_personal (001_core_schema.sql).
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
import { PersonalCorte } from './personal-corte.entity';
import { FrenteTipoPersonal } from './frente-tipo-personal.entity';

@Entity({ name: 'tipo_personal' })
export class TipoPersonal {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  // Nulo cuando el Excel no permite asignarla con certeza (ej. EMVARIAS).
  @Column({ type: 'integer', name: 'dependencia_id', nullable: true })
  dependenciaId!: number | null;

  @Column({ type: 'boolean', default: true })
  activo!: boolean;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Dependencia, (dependencia) => dependencia.tiposPersonal, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'dependencia_id' })
  dependencia!: Dependencia | null;

  @OneToMany(() => PersonalCorte, (corte) => corte.tipoPersonal)
  cortes!: PersonalCorte[];

  @OneToMany(
    () => FrenteTipoPersonal,
    (frenteTipoPersonal) => frenteTipoPersonal.tipoPersonal,
  )
  frentes!: FrenteTipoPersonal[];
}
