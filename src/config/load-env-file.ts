import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Carrega o arquivo .env (se existir) em process.env para scripts executados fora do Nest
 * (CLI do TypeORM, seeds, criação do banco). Variáveis já definidas no ambiente têm prioridade.
 */
export function loadEnvFile(path = resolve(process.cwd(), '.env')): void {
  if (existsSync(path)) {
    process.loadEnvFile(path);
  }
}
