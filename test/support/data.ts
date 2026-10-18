/**
 * Identificador único em runtime para o dado criado por um arquivo de teste.
 * Use com o prefixo `e2e-` (ex.: `e2e-${STAMP}@empresa.com.br`).
 */
export const stamp = (): string => Date.now().toString().slice(-8);
