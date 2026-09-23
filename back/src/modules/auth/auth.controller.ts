import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Body } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { UsuarioActual } from '@/common/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '@/common/decorators/usuario-actual.decorator';
import { leerCookie } from '@/common/utils/cookies.util';
import { LoginRateLimitGuard } from '@/common/guards/login-rate-limit.guard';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(LoginRateLimitGuard)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { accessToken, refreshToken, usuario } =
      await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return { accessToken, usuario };
  }

  // Público a nivel de JwtAuthGuard (no exige Bearer): se autentica con la
  // cookie httpOnly, no con el access token (que puede estar vencido, es
  // justamente el motivo de llamar a /refresh).
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = leerCookie(req, REFRESH_COOKIE);
    if (!refreshToken) {
      throw new UnauthorizedException('Falta el refresh token');
    }

    const {
      accessToken,
      refreshToken: nuevoRefreshToken,
      usuario,
    } = await this.authService.refrescar(refreshToken);
    this.setRefreshCookie(res, nuevoRefreshToken);
    return { accessToken, usuario };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: REFRESH_COOKIE_PATH });
    return { ok: true };
  }

  @Get('me')
  me(@UsuarioActual() usuario: UsuarioAutenticado) {
    return this.authService.me(usuario.id);
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: REFRESH_COOKIE_PATH,
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });
  }
}
