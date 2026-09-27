import { Logger } from '@nestjs/common';
import { createConnection } from 'mysql2/promise';
import { validateEnv } from '../../config/env.validation';
import { loadEnvFile } from '../../config/load-env-file';

/**
 * Cria o banco de dados configurado em DB_DATABASE, caso ainda não exista.
 * O usuário DB_USERNAME precisa de permissão CREATE no servidor MySQL.
 */
async function main() {
  loadEnvFile();
  const env = validateEnv(process.env);
  const logger = new Logger('CreateDatabase');

  const connection = await createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  });

  try {
    const database = env.DB_DATABASE.replace(/`/g, '``');
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    logger.log(`Banco de dados "${env.DB_DATABASE}" pronto.`);
  } finally {
    await connection.end();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
