import { RolUsuario } from '@/database/entities/usuario.entity';

// Nunca incluye password_hash: se arma a mano en el service, no se serializa
// la entidad completa.
export interface UsuarioRespuestaDto {
  id: string;
  email: string;
  nombre: string;
  rol: RolUsuario;
  activo: boolean;
  ultimoAcceso: Date | null;
  frentes: { id: number; nombre: string; slug: string }[];
}
