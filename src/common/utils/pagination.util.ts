import { PaginatedResult, PaginationQueryDto } from '../dto/pagination.dto';

/** Converte a paginação da requisição em `skip`/`take` do TypeORM. */
export function toSkipTake({ page, limit }: PaginationQueryDto): {
  skip: number;
  take: number;
} {
  return { skip: (page - 1) * limit, take: limit };
}

export function toPaginatedResult<T>(
  data: T[],
  total: number,
  { page, limit }: PaginationQueryDto,
): PaginatedResult<T> {
  return {
    data,
    meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}
