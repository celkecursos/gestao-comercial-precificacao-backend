import { loadEnvFile } from '../../src/config/load-env-file';

/**
 * Ambiente dos testes e2e: usa o banco DB_TEST_DATABASE (padrão: "<DB_DATABASE>_test"),
 * que é APAGADO e recriado a cada execução.
 * Idempotente: é carregado tanto pelo globalSetup quanto antes de cada arquivo de teste.
 */
if (process.env.E2E_ENV_APPLIED !== 'true') {
  loadEnvFile();

  const mainDatabase = process.env.DB_DATABASE;
  const testDatabase =
    process.env.DB_TEST_DATABASE ||
    `${mainDatabase ?? 'gestao_comercial'}_test`;

  if (testDatabase === mainDatabase) {
    throw new Error(
      'DB_TEST_DATABASE não pode ser igual a DB_DATABASE: os testes e2e apagam o banco de testes.',
    );
  }

  process.env.NODE_ENV = 'test';
  process.env.DB_DATABASE = testDatabase;
  process.env.DB_MIGRATIONS_RUN = 'false';
  process.env.DB_SEED_ON_STARTUP = 'false';
  process.env.ADMIN_NAME = '';
  process.env.ADMIN_EMAIL = '';
  process.env.ADMIN_PASSWORD = '';
  process.env.DB_LOGGING = 'false';
  process.env.SWAGGER_ENABLED = 'true';
  process.env.E2E_ENV_APPLIED = 'true';
}
