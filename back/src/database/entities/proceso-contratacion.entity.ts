// Mapea core.proceso_contratacion (001_core_schema.sql). Del precontractual
// al terminado; el mismo registro sirve para el contrato principal o su
// interventoría (tipo + proceso_supervisado_id).
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
import { Actividad } from './actividad.entity';
import { EstadoProceso } from './estado-proceso.entity';
import { Contratista } from './contratista.entity';
import { Usuario } from './usuario.entity';
import { Seguimiento } from './seguimiento.entity';
import { FrenteProceso } from './frente-proceso.entity';
import { PersonalOperador } from './personal-operador.entity';

// Coincide con el CHECK de core.proceso_contratacion.tipo.
export enum TipoProceso {
  PRINCIPAL = 'PRINCIPAL',
  INTERVENTORIA = 'INTERVENTORIA',
}

@Entity({ name: 'proceso_contratacion' })
export class ProcesoContratacion {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'integer', name: 'actividad_id' })
  actividadId!: number;

  @Column({ type: 'smallint', name: 'estado_id' })
  estadoId!: number;

  @Column({ type: 'integer', name: 'contratista_id', nullable: true })
  contratistaId!: number | null;

  @Column({
    type: 'varchar',
    length: 15,
    enum: TipoProceso,
    default: TipoProceso.PRINCIPAL,
  })
  tipo!: TipoProceso;

  // Contrato que vigila una interventoría (se enlaza manualmente).
  @Column({
    type: 'bigint',
    name: 'proceso_supervisado_id',
    nullable: true,
  })
  procesoSupervisadoId!: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'numero_contrato',
    unique: true,
    nullable: true,
  })
  numeroContrato!: string | null;

  // No es único: el Excel trae la necesidad 56173 en dos procesos.
  @Column({
    type: 'varchar',
    length: 20,
    name: 'numero_necesidad',
    nullable: true,
  })
  numeroNecesidad!: string | null;

  @Column({ type: 'date', name: 'fecha_inicio', nullable: true })
  fechaInicio!: string | null;

  @Column({ type: 'date', name: 'fecha_terminacion', nullable: true })
  fechaTerminacion!: string | null;

  @Column({ type: 'text', name: 'link_secop', nullable: true })
  linkSecop!: string | null;

  @Column({ type: 'text', nullable: true })
  observacion!: string | null;

  @Column({ type: 'uuid', name: 'created_by', nullable: true })
  createdBy!: string | null;

  @Column({ type: 'uuid', name: 'updated_by', nullable: true })
  updatedBy!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt!: Date;

  @ManyToOne(() => Actividad, (actividad) => actividad.procesos, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'actividad_id' })
  actividad!: Actividad;

  @ManyToOne(() => EstadoProceso, (estado) => estado.procesos, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'estado_id' })
  estado!: EstadoProceso;

  @ManyToOne(() => Contratista, (contratista) => contratista.procesos, {
    onDelete: 'RESTRICT',
    nullable: true,
  })
  @JoinColumn({ name: 'contratista_id' })
  contratista!: Contratista | null;

  @ManyToOne(() => ProcesoContratacion, (proceso) => proceso.interventorias, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'proceso_supervisado_id' })
  procesoSupervisado!: ProcesoContratacion | null;

  // Interventorías (tipo=INTERVENTORIA) que vigilan este contrato.
  @OneToMany(() => ProcesoContratacion, (proceso) => proceso.procesoSupervisado)
  interventorias!: ProcesoContratacion[];

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'created_by' })
  creadoPor!: Usuario | null;

  @ManyToOne(() => Usuario, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'updated_by' })
  actualizadoPor!: Usuario | null;

  @OneToMany(() => Seguimiento, (seguimiento) => seguimiento.proceso)
  seguimientos!: Seguimiento[];

  @OneToMany(() => FrenteProceso, (frenteProceso) => frenteProceso.proceso)
  frentes!: FrenteProceso[];

  @OneToMany(() => PersonalOperador, (operador) => operador.proceso)
  operaciones!: PersonalOperador[];
}
