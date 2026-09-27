import { TransformFnParams } from 'class-transformer';

/**
 * Converte valores textuais ("true", "false", "1", "0") em boolean.
 * Útil para query strings e variáveis de ambiente, que sempre chegam como texto.
 * Valores não reconhecidos são mantidos para que o class-validator os rejeite.
 */
export function toBoolean({ value }: TransformFnParams): unknown {
  if (typeof value === 'boolean') return value;
  if (value === 'true' || value === '1') return true;
  if (value === 'false' || value === '0') return false;
  return value;
}
