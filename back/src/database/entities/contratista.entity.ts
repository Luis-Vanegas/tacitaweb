// Mapea core.contratista (001_core_schema.sql). Contratistas/operadores,
// deduplicados por clave de texto (índice funcional, no se replica aquí).
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { ProcesoContratacion } from './proceso-contratacion.entity';
import { PersonalOperador } from './personal-operador.entity';

@Entity({ name: 'contratista' })
export class Contratista {
  @PrimaryGeneratedColumn({ type: 'integer' })
  id!: number;

  @Column({ type: 'text' })
  nombre!: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  nit!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => ProcesoContratacion, (proceso) => proceso.contratista)
  procesos!: ProcesoContratacion[];

  @OneToMany(() => PersonalOperador, (operador) => operador.contratista)
  operaciones!: PersonalOperador[];
}
