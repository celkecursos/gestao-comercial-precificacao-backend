import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { buildDataSourceOptions } from '../config/database.config';
import { EnvironmentVariables } from '../config/env.validation';
import { DatabaseBootstrapService } from './database-bootstrap.service';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        buildDataSourceOptions({
          DB_HOST: config.get('DB_HOST', { infer: true }),
          DB_PORT: config.get('DB_PORT', { infer: true }),
          DB_DATABASE: config.get('DB_DATABASE', { infer: true }),
          DB_USERNAME: config.get('DB_USERNAME', { infer: true }),
          DB_PASSWORD: config.get('DB_PASSWORD', { infer: true }),
          DB_LOGGING: config.get('DB_LOGGING', { infer: true }),
          DB_MIGRATIONS_RUN: config.get('DB_MIGRATIONS_RUN', { infer: true }),
        }),
    }),
  ],
  providers: [DatabaseBootstrapService],
})
export class DatabaseModule {}
