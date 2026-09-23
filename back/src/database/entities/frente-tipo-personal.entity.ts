// Mapea core.frente_tipo_personal (001_core_schema.sql). Relación N:M
// frente↔tipo de personal.
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Frente } from './frente.entity';
import { TipoPersonal } from './tipo-personal.entity';

@Entity({ name: 'frente_tipo_personal' })
export class FrenteTipoPersonal {
  @PrimaryColumn({ type: 'smallint', name: 'frente_id' })
  frenteId!: number;

  @PrimaryColumn({ type: 'integer', name: 'tipo_personal_id' })
  tipoPersonalId!: number;

  @Column({ type: 'text', nullable: true })
  nota!: string | null;

  @ManyToOne(() => Frente, (frente) => frente.tiposPersonal, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'frente_id' })
  frente!: Frente;

  @ManyToOne(() => TipoPersonal, (tipoPersonal) => tipoPersonal.frentes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tipo_personal_id' })
  tipoPersonal!: TipoPersonal;
}
