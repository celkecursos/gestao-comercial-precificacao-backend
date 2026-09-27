import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Environment, EnvironmentVariables } from '../config/env.validation';
import { ensureInitialAdmin } from './seeds/initial-admin';
import { runSeeds } from './seeds/run-seeds';

/**
 * Tarefas de banco executadas ao iniciar a aplicação, antes de a API começar a responder.
 * Permitem o deploy automático (ex.: Hostinger) sem comandos no servidor.
 *
 * Ordem completa da inicialização:
 * 1. migrations pendentes — aplicadas pelo TypeORM ao conectar (DB_MIGRATIONS_RUN=true);
 * 2. administrador inicial — criado se não houver nenhum ADMIN (ADMIN_NAME/EMAIL/PASSWORD);
 * 3. seeds de demonstração — idempotentes (DB_SEED_ON_STARTUP=true).
 *
 * Qualquer falha impede a aplicação de subir, deixando o erro visível nos logs.
 */
@Injectable()
export class DatabaseBootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(DatabaseBootstrapService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.ensureInitialAdmin();
    await this.runDemoSeeds();
  }

  private async ensureInitialAdmin(): Promise<void> {
    const name = this.config.get('ADMIN_NAME', { infer: true });
    const email = this.config.get('ADMIN_EMAIL', { infer: true });
    const password = this.config.get('ADMIN_PASSWORD', { infer: true });
    // A validação do .env garante que as três variáveis são informadas em conjunto.
    if (!name || !email || !password) return;

    const result = await ensureInitialAdmin(
      this.dataSource,
      { name, email, password },
      this.config.get('BCRYPT_SALT_ROUNDS', { infer: true }),
    );

    if (result === 'created') {
      this.logger.log(
        `Administrador inicial criado (${email}). As variáveis ADMIN_* já podem ser removidas.`,
      );
    } else {
      this.logger.log(
        'Já existe um administrador: variáveis ADMIN_* ignoradas (podem ser removidas).',
      );
    }
  }

  private async runDemoSeeds(): Promise<void> {
    if (!this.config.get('DB_SEED_ON_STARTUP', { infer: true })) return;

    if (
      this.config.get('NODE_ENV', { infer: true }) === Environment.Production
    ) {
      this.logger.warn(
        'DB_SEED_ON_STARTUP=true em produção: usuários de demonstração serão garantidos. Desative após a demonstração.',
      );
    }

    await runSeeds(
      this.dataSource,
      this.config.get('BCRYPT_SALT_ROUNDS', { infer: true }),
    );
    this.logger.log('Seeds de demonstração verificados/aplicados.');
  }
}
