import { ValueTransformer } from 'typeorm';

/**
 * O driver MySQL retorna colunas DECIMAL como string para não perder precisão.
 * Este transformer as converte para number na leitura.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | null) => (value === null ? null : Number(value)),
};
