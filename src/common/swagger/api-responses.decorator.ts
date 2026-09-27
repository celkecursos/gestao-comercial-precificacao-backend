import { applyDecorators, HttpStatus, Type } from '@nestjs/common';
import {
  ApiExtraModels,
  ApiOkResponse,
  ApiResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { ErrorResponseDto } from '../dto/error-response.dto';
import { PaginationMetaDto } from '../dto/pagination.dto';

const ERROR_DESCRIPTIONS: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Dados inválidos',
  [HttpStatus.UNAUTHORIZED]: 'Não autenticado ou token inválido',
  [HttpStatus.FORBIDDEN]: 'Sem permissão para o recurso',
  [HttpStatus.NOT_FOUND]: 'Registro não encontrado',
  [HttpStatus.CONFLICT]: 'Conflito com dados existentes',
};

/** Documenta no Swagger as respostas de erro informadas, todas no formato ErrorResponseDto. */
export function ApiErrorResponses(...statuses: HttpStatus[]) {
  return applyDecorators(
    ...statuses.map((status) =>
      ApiResponse({
        status,
        description: ERROR_DESCRIPTIONS[status],
        type: ErrorResponseDto,
      }),
    ),
  );
}

/** Documenta uma resposta paginada `{ data: Model[], meta }`. */
export function ApiPaginatedResponse<TModel extends Type<unknown>>(
  model: TModel,
) {
  return applyDecorators(
    ApiExtraModels(model, PaginationMetaDto),
    ApiOkResponse({
      schema: {
        type: 'object',
        required: ['data', 'meta'],
        properties: {
          data: { type: 'array', items: { $ref: getSchemaPath(model) } },
          meta: { $ref: getSchemaPath(PaginationMetaDto) },
        },
      },
    }),
  );
}
