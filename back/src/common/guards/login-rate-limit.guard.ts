// ponytail: limitador en memoria, una sola instancia — subir a @nestjs/throttler
// o Redis si el backend escala horizontalmente (cada instancia tendría su
// propio Map y el límite real sería N * instancias).
import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';

interface IntentosLogin {
  intentos: number;
  primerIntentoEn: number;
}

const VENTANA_MS = 15 * 60 * 1000;
// 30 en vez de 5: con el auto-login de demo (front/features/auth/authSaga.ts)
// cada recarga de página sin cookie de refresh dispara un intento de login
// más, y 5 se agotaba con unas pocas recargas normales.
const MAX_INTENTOS = 30;

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  private readonly registro = new Map<string, IntentosLogin>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const email =
      typeof request.body?.email === 'string'
        ? request.body.email.toLowerCase()
        : '';
    const clave = `${request.ip}:${email}`;
    const ahora = Date.now();
    const entrada = this.registro.get(clave);

    if (!entrada || ahora - entrada.primerIntentoEn > VENTANA_MS) {
      this.registro.set(clave, { intentos: 1, primerIntentoEn: ahora });
      return true;
    }

    if (entrada.intentos >= MAX_INTENTOS) {
      throw new HttpException(
        'Demasiados intentos de inicio de sesión. Probá de nuevo en unos minutos.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entrada.intentos += 1;
    return true;
  }
}
