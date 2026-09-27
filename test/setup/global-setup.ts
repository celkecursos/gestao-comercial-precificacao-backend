import './e2e-env';
import { createConnection } from 'mysql2/promise';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../../src/config/database.config';
import { validateEnv } from '../../src/config/env.validation';
import { runSeeds } from '../../src/database/seeds/run-seeds';

/** Recria o banco de testes do zero: cria (se preciso), limpa, aplica migrations e seeds. */
export default async function globalSetup(): Promise<void> {
  const env = validateEnv(process.env);

  const connection = await createConnection({
    host: env.DB_HOST,
    port: env.DB_PORT,
    user: env.DB_USERNAME,
    password: env.DB_PASSWORD,
  });
  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${env.DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
  );
  await connection.end();

  const dataSource = new DataSource(buildDataSourceOptions(env));
  await dataSource.initialize();
  try {
    await dataSource.dropDatabase();
    await dataSource.runMigrations();
    await runSeeds(dataSource, env.BCRYPT_SALT_ROUNDS);
  } finally {
    await dataSource.destroy();
  }
}
