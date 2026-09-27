import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { ErrorResponseDto } from '../dto/error-response.dto';

interface ResolvedError {
  statusCode: number;
  error: string;
  message: string | string[];
}

/** Erros do MySQL traduzidos para respostas HTTP amigáveis. */
const DATABASE_ERRORS: Record<string, { status: HttpStatus; message: string }> =
  {
    ER_DUP_ENTRY: {
      status: HttpStatus.CONFLICT,
      message: 'Já existe um registro com estes dados.',
    },
    ER_ROW_IS_REFERENCED_2: {
      status: HttpStatus.CONFLICT,
      message: 'O registro está em uso e não pode ser excluído.',
    },
  };

/**
 * Filtro global que padroniza todas as respostas de erro no formato ErrorResponseDto.
 * Erros inesperados são registrados em log e retornados como 500 sem expor detalhes internos.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const resolved = this.resolve(exception);

    if (resolved.statusCode >= 500) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ErrorResponseDto = {
      ...resolved,
      path: request.url,
      timestamp: new Date().toISOString(),
    };
    response.status(resolved.statusCode).json(body);
  }

  private resolve(exception: unknown): ResolvedError {
    if (exception instanceof HttpException) {
      const statusCode = exception.getStatus();
      const response = exception.getResponse();

      if (typeof response === 'string') {
        return { statusCode, error: exception.name, message: response };
      }

      const { message, error } = response as {
        message?: string | string[];
        error?: string;
      };
      return {
        statusCode,
        error: error ?? exception.name,
        message: message ?? exception.message,
      };
    }

    if (exception instanceof QueryFailedError) {
      const code = (exception.driverError as { code?: string } | undefined)
        ?.code;
      const known = code ? DATABASE_ERRORS[code] : undefined;
      if (known) {
        return {
          statusCode: known.status,
          error: 'Conflict',
          message: known.message,
        };
      }
    }

    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'Internal Server Error',
      message: 'Erro interno do servidor.',
    };
  }
}
