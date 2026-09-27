import { FindOperator, Like } from 'typeorm';

/** Cria um filtro `LIKE %termo%`, escapando os curingas digitados pelo usuário. */
export function containsText(term: string): FindOperator<string> {
  const escaped = term.replace(/[\\%_]/g, (char) => `\\${char}`);
  return Like(`%${escaped}%`);
}
