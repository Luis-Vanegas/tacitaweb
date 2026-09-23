// Mapea core.auditoria (001_core_schema.sql). La escribe el trigger
// core.registrar_auditoria() (security definer); el backend nunca inserta
// aquí directamente, solo fija app.usuario_id por transacción
// (ver common/database/auditoria.helper.ts). usuario_id NO tiene FK en la BD
// a propósito (la fila de auditoría debe sobrevivir aunque se borre el
// usuario), así que no se modela como relación.
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

// Coincide con el CHECK de core.auditoria.accion.
export enum AccionAuditoria {
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
}

@Entity({ name: 'auditoria' })
export class Auditoria {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ type: 'text' })
  tabla!: string;

  @Column({ type: 'text', name: 'registro_id' })
  registroId!: string;

  @Column({ type: 'varchar', length: 6, enum: AccionAuditoria })
  accion!: AccionAuditoria;

  @Column({ type: 'jsonb', name: 'datos_antes', nullable: true })
  datosAntes!: Record<string, unknown> | null;

  @Column({ type: 'jsonb', name: 'datos_despues', nullable: true })
  datosDespues!: Record<string, unknown> | null;

  @Column({ type: 'uuid', name: 'usuario_id', nullable: true })
  usuarioId!: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt!: Date;
}
