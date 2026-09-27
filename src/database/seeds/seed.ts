import { Logger } from '@nestjs/common';
import { Environment, validateEnv } from '../../config/env.validation';
import AppDataSource from '../data-source';
import { runSeeds } from './run-seeds';

/**
 * Executa os seeds: `npm run seed` (desenvolvimento) ou `npm run seed:prod` (build).
 * Em produção é necessário confirmar com `--force`, pois cria usuários com senha de demonstração.
 */
async function main() {
  const logger = new Logger('Seed');
  const env = validateEnv(process.env);

  if (
    env.NODE_ENV === Environment.Production &&
    !process.argv.includes('--force')
  ) {
    logger.warn(
      'NODE_ENV=production: os seeds criam usuários com senha de demonstração. Use --force para confirmar.',
    );
    process.exitCode = 1;
    return;
  }

  await AppDataSource.initialize();
  try {
    await runSeeds(AppDataSource, env.BCRYPT_SALT_ROUNDS);
    logger.log('Seeds executados com sucesso.');
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
