// Mapea core.usuario_frente (001_core_schema.sql). Alcance: qué frentes puede
// editar un EDITOR (ADMIN ve y edita todo, no necesita filas aquí).
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Frente } from './frente.entity';

@Entity({ name: 'usuario_frente' })
export class UsuarioFrente {
  @PrimaryColumn({ type: 'uuid', name: 'usuario_id' })
  usuarioId!: string;

  @PrimaryColumn({ type: 'smallint', name: 'frente_id' })
  frenteId!: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.frentes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario!: Usuario;

  @ManyToOne(() => Frente, (frente) => frente.usuarios, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'frente_id' })
  frente!: Frente;
}
