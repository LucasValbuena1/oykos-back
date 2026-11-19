import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';

/** Códigos de PostgreSQL que traducimos a una respuesta clara en vez de un 500. */
const PG_ERRORS: Record<string, { status: number; message: string }> = {
  '23505': {
    status: HttpStatus.CONFLICT,
    message: 'Ya existe un registro con esos datos',
  },
  '23503': {
    status: HttpStatus.CONFLICT,
    message:
      'El registro está relacionado con otro que no existe o que depende de él',
  },
  '23514': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Un valor no cumple las reglas de la base de datos',
  },
  '22P02': {
    status: HttpStatus.BAD_REQUEST,
    message: 'Un valor tiene un formato inválido',
  },
};

@Catch(QueryFailedError)
export class QueryFailedFilter implements ExceptionFilter {
  catch(exception: QueryFailedError & { code?: string }, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    const known = exception.code ? PG_ERRORS[exception.code] : undefined;
    const status = known?.status ?? HttpStatus.INTERNAL_SERVER_ERROR;
    res.status(status).json({
      statusCode: status,
      message: known?.message ?? 'Error interno',
      error: known ? 'DatabaseConstraint' : 'InternalServerError',
    });
  }
}
