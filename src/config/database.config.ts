import { join } from 'node:path';
import { DataSourceOptions } from 'typeorm';
import { EnvironmentVariables } from './env.validation';

type DatabaseEnv = Pick<
  EnvironmentVariables,
  | 'DB_HOST'
  | 'DB_PORT'
  | 'DB_DATABASE'
  | 'DB_USERNAME'
  | 'DB_PASSWORD'
  | 'DB_LOGGING'
  | 'DB_MIGRATIONS_RUN'
>;

/**
 * Opções do TypeORM compartilhadas entre a aplicação Nest, a CLI de migrations e os seeds.
 * Entidades (*.entity.ts) e migrations são descobertas automaticamente por convenção de nome.
 */
export function buildDataSourceOptions(env: DatabaseEnv): DataSourceOptions {
  return {
    type: 'mysql',
    host: env.DB_HOST,
    port: env.DB_PORT,
    database: env.DB_DATABASE,
    username: env.DB_USERNAME,
    password: env.DB_PASSWORD,
    charset: 'utf8mb4_unicode_ci',
    timezone: 'Z',
    // Colunas DATE retornam como texto (YYYY-MM-DD), evitando deslocamento de fuso horário.
    dateStrings: ['DATE'],
    entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
    migrations: [join(__dirname, '..', 'database', 'migrations', '*.{ts,js}')],
    migrationsTableName: 'migrations',
    migrationsRun: env.DB_MIGRATIONS_RUN,
    synchronize: false,
    logging: env.DB_LOGGING,
  };
}
