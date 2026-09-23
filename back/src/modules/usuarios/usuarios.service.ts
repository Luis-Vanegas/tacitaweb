import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '@/database/entities/usuario.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { ejecutarConAuditoria } from '@/common/database/auditoria.helper';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { UsuarioRespuestaDto } from './dto/usuario-respuesta.dto';

const RONDAS_BCRYPT = 10;

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly dataSource: DataSource,
  ) {}

  async listar(): Promise<UsuarioRespuestaDto[]> {
    const usuarios = await this.usuarioRepository.find({
      relations: ['frentes', 'frentes.frente'],
      order: { nombre: 'ASC' },
    });
    return usuarios.map((usuario) => this.aRespuesta(usuario));
  }

  async obtener(id: string): Promise<UsuarioRespuestaDto> {
    const usuario = await this.buscarOFallar(id);
    return this.aRespuesta(usuario);
  }

  async crear(
    dto: CrearUsuarioDto,
    actorId: string,
  ): Promise<UsuarioRespuestaDto> {
    const passwordHash = await bcrypt.hash(dto.password, RONDAS_BCRYPT);

    const id = await ejecutarConAuditoria(
      this.dataSource,
      actorId,
      async (manager) => {
        const usuario = manager.create(Usuario, {
          email: dto.email.toLowerCase(),
          nombre: dto.nombre,
          passwordHash,
          rol: dto.rol,
          activo: dto.activo ?? true,
        });
        const guardado = await manager.save(usuario);

        if (dto.frentes?.length) {
          await manager.save(
            UsuarioFrente,
            dto.frentes.map((frenteId) =>
              manager.create(UsuarioFrente, {
                usuarioId: guardado.id,
                frenteId,
              }),
            ),
          );
        }
        return guardado.id;
      },
    );

    return this.obtener(id);
  }

  async actualizar(
    id: string,
    dto: ActualizarUsuarioDto,
    actorId: string,
  ): Promise<UsuarioRespuestaDto> {
    await this.buscarOFallar(id);

    await ejecutarConAuditoria(this.dataSource, actorId, async (manager) => {
      const cambios: Partial<Usuario> = {};
      if (dto.email) cambios.email = dto.email.toLowerCase();
      if (dto.nombre) cambios.nombre = dto.nombre;
      if (dto.rol) cambios.rol = dto.rol;
      if (dto.activo !== undefined) cambios.activo = dto.activo;
      if (dto.password) {
        cambios.passwordHash = await bcrypt.hash(dto.password, RONDAS_BCRYPT);
      }
      if (Object.keys(cambios).length > 0) {
        await manager.update(Usuario, id, cambios);
      }

      if (dto.frentes) {
        await manager.delete(UsuarioFrente, { usuarioId: id });
        if (dto.frentes.length > 0) {
          await manager.save(
            UsuarioFrente,
            dto.frentes.map((frenteId) =>
              manager.create(UsuarioFrente, { usuarioId: id, frenteId }),
            ),
          );
        }
      }
    });

    return this.obtener(id);
  }

  async eliminar(id: string, actorId: string): Promise<void> {
    await this.buscarOFallar(id);
    await ejecutarConAuditoria(this.dataSource, actorId, async (manager) => {
      await manager.delete(Usuario, id);
    });
  }

  private async buscarOFallar(id: string): Promise<Usuario> {
    const usuario = await this.usuarioRepository.findOne({
      where: { id },
      relations: ['frentes', 'frentes.frente'],
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }
    return usuario;
  }

  private aRespuesta(usuario: Usuario): UsuarioRespuestaDto {
    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo,
      ultimoAcceso: usuario.ultimoAcceso,
      frentes: (usuario.frentes ?? []).map((uf) => ({
        id: uf.frente.id,
        nombre: uf.frente.nombre,
        slug: uf.frente.slug,
      })),
    };
  }
}
