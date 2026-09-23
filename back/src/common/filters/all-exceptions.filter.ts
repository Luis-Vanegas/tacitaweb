// Filtro global de excepciones. Mapea errores de Postgres a códigos HTTP
// (23505 unique -> 409, 23503 FK -> 409, 23514 check -> 400) y deja pasar las
// HttpException de Nest tal cual. Cualquier otro error se responde como 500
// genérico, sin filtrar detalles internos (mensaje real solo va al log).
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';

// Subconjunto de los campos que expone `pg` en sus errores de driver.
interface ErrorPostgres extends Error {
  code?: string;
  detail?: string;
}

const CODIGOS_POSTGRES: Record<string, { status: number; error: string }> = {
  '23505': { status: HttpStatus.CONFLICT, error: 'Conflict' }, // unique_violation
  '23503': { status: HttpStatus.CONFLICT, error: 'Conflict' }, // foreign_key_violation
  '23514': { status: HttpStatus.BAD_REQUEST, error: 'Bad Request' }, // check_violation
};

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      response
        .status(status)
        .json(
          typeof body === 'string'
            ? { statusCode: status, error: exception.name, message: body }
            : body,
        );
      return;
    }

    const errorPg = exception as ErrorPostgres;
    if (errorPg?.code && CODIGOS_POSTGRES[errorPg.code]) {
      const { status, error } = CODIGOS_POSTGRES[errorPg.code];
      response.status(status).json({
        statusCode: status,
        error,
        message: this.mensajePostgres(errorPg.code),
      });
      return;
    }

    // Error no reconocido: se loguea completo pero al cliente solo el genérico.
    this.logger.error(exception instanceof Error ? exception.stack : exception);
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Ocurrió un error inesperado',
    });
  }

  private mensajePostgres(codigo: string): string {
    switch (codigo) {
      case '23505':
        return 'El registro ya existe (violación de unicidad)';
      case '23503':
        return 'La operación viola una relación existente';
      case '23514':
        return 'El dato no cumple una regla de validación';
      default:
        return 'Error de base de datos';
    }
  }
}
