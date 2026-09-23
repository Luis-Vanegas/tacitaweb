// Login/refresh/logout/me. El access token usa el JwtModule global (secret
// JWT_SECRET, 15 min, configurado en app.module.ts); el refresh token pisa
// ese default con JWT_REFRESH_SECRET y 7 días, así no hace falta un segundo
// JwtModule registrado.
import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { Usuario } from '@/database/entities/usuario.entity';
import { UsuarioFrente } from '@/database/entities/usuario-frente.entity';
import { EnvironmentVariables } from '@/config/env.validation';
import { LoginDto } from './dto/login.dto';

interface JwtPayload {
  sub: string;
  email: string;
  rol: string;
}

export interface TokensEmitidos {
  accessToken: string;
  refreshToken: string;
  usuario: {
    id: string;
    email: string;
    nombre: string;
    rol: string;
  };
}

const REFRESH_EXPIRES_IN = '7d';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(UsuarioFrente)
    private readonly usuarioFrenteRepository: Repository<UsuarioFrente>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<EnvironmentVariables, true>,
  ) {}

  async login(dto: LoginDto): Promise<TokensEmitidos> {
    // password_hash tiene select:false en la entidad: hay que pedirlo a mano.
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.passwordHash')
      .where('usuario.email = :email', { email: dto.email.toLowerCase() })
      .getOne();

    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const valido = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!valido) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Metadata de sesión, no dato de negocio auditable: update directo, sin
    // pasar por ejecutarConAuditoria (esa función es para escrituras de negocio).
    await this.usuarioRepository.update(usuario.id, {
      ultimoAcceso: new Date(),
    });

    return this.emitirTokens(usuario);
  }

  async refrescar(refreshToken: string): Promise<TokensEmitidos> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }

    const usuario = await this.usuarioRepository.findOne({
      where: { id: payload.sub },
    });
    if (!usuario || !usuario.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return this.emitirTokens(usuario);
  }

  async me(usuarioId: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id: usuarioId },
    });
    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const frentes = await this.usuarioFrenteRepository.find({
      where: { usuarioId },
      relations: ['frente'],
    });

    return {
      id: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      activo: usuario.activo,
      frentes: frentes.map((uf) => ({
        id: uf.frente.id,
        nombre: uf.frente.nombre,
        slug: uf.frente.slug,
      })),
    };
  }

  private emitirTokens(usuario: Usuario): TokensEmitidos {
    const payload: JwtPayload = {
      sub: usuario.id,
      email: usuario.email,
      rol: usuario.rol,
    };

    const accessToken = this.jwtService.sign(payload);
    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', { infer: true }),
      expiresIn: REFRESH_EXPIRES_IN,
    });

    return {
      accessToken,
      refreshToken,
      usuario: {
        id: usuario.id,
        email: usuario.email,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    };
  }
}
