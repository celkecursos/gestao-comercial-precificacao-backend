import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

/** Valida uma data no formato ISO `YYYY-MM-DD` (sem horário). */
export function IsDateOnly() {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, {
      message: '$property deve estar no formato YYYY-MM-DD.',
    }),
    IsISO8601(
      { strict: true },
      { message: '$property deve ser uma data válida.' },
    ),
  );
}
