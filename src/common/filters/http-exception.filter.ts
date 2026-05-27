import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';

interface PgError {
  code?: string;
  detail?: string;
  constraint?: string;
}

function pgErrorToHttp(err: QueryFailedError): { status: number; message: string } {
  const pg = (err as unknown as { driverError: PgError }).driverError;
  if (pg?.code === '23505') {
    if (pg.constraint?.includes('sku') || pg.detail?.includes('sku')) {
      return { status: HttpStatus.CONFLICT, message: 'El SKU ya está en uso por otro producto' };
    }
    return { status: HttpStatus.CONFLICT, message: 'Ya existe un registro con ese valor único' };
  }
  if (pg?.code === '23503') {
    return { status: HttpStatus.CONFLICT, message: 'No se puede eliminar: tiene registros asociados' };
  }
  return { status: HttpStatus.INTERNAL_SERVER_ERROR, message: 'Error interno del servidor' };
}

@Catch(HttpException, QueryFailedError)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException | QueryFailedError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode: number;
    let message: string;

    if (exception instanceof QueryFailedError) {
      const mapped = pgErrorToHttp(exception);
      statusCode = mapped.status;
      message = mapped.message;
    } else {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : (exceptionResponse as { message: string | string[] }).message instanceof Array
            ? ((exceptionResponse as { message: string[] }).message).join(', ')
            : (exceptionResponse as { message: string }).message;
    }

    response.status(statusCode).json({
      data: null,
      message,
      statusCode,
    });
  }
}
