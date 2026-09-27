import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { buildDataSourceOptions } from '../config/database.config';
import { validateEnv } from '../config/env.validation';
import { loadEnvFile } from '../config/load-env-file';

/**
 * DataSource usado pela CLI do TypeORM (migrations) e pelos seeds.
 * A aplicação Nest usa as mesmas opções através do DatabaseModule.
 */
loadEnvFile();

const AppDataSource = new DataSource(
  buildDataSourceOptions(validateEnv(process.env)),
);

export default AppDataSource;
