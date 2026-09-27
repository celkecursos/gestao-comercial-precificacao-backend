import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { Environment } from '../config/env.validation';
import { DatabaseBootstrapService } from './database-bootstrap.service';
import { ensureInitialAdmin } from './seeds/initial-admin';
import { runSeeds } from './seeds/run-seeds';

jest.mock('./seeds/run-seeds', () => ({ runSeeds: jest.fn() }));
jest.mock('./seeds/initial-admin', () => ({ ensureInitialAdmin: jest.fn() }));

describe('DatabaseBootstrapService', () => {
  const dataSource = {} as DataSource;
  const admin = {
    ADMIN_NAME: 'Admin Produção',
    ADMIN_EMAIL: 'admin@empresa.com.br',
    ADMIN_PASSWORD: 'SenhaForte@2026',
  };

  const buildService = (env: Record<string, unknown>) =>
    new DatabaseBootstrapService(dataSource, {
      get: (key: string) => ({ BCRYPT_SALT_ROUNDS: 10, ...env })[key],
    } as unknown as ConfigService);

  beforeEach(() => {
    jest.mocked(runSeeds).mockReset();
    jest.mocked(ensureInitialAdmin).mockReset().mockResolvedValue('created');
  });

  it('não faz nada quando nenhuma tarefa está configurada', async () => {
    await buildService({ DB_SEED_ON_STARTUP: false }).onApplicationBootstrap();
    expect(ensureInitialAdmin).not.toHaveBeenCalled();
    expect(runSeeds).not.toHaveBeenCalled();
  });

  describe('administrador inicial', () => {
    it('é garantido quando as variáveis ADMIN_* estão definidas', async () => {
      await buildService(admin).onApplicationBootstrap();
      expect(ensureInitialAdmin).toHaveBeenCalledWith(
        dataSource,
        {
          name: admin.ADMIN_NAME,
          email: admin.ADMIN_EMAIL,
          password: admin.ADMIN_PASSWORD,
        },
        10,
      );
    });

    it('roda antes dos seeds de demonstração', async () => {
      const calls: string[] = [];
      jest.mocked(ensureInitialAdmin).mockImplementation(() => {
        calls.push('admin');
        return Promise.resolve('created');
      });
      jest.mocked(runSeeds).mockImplementation(() => {
        calls.push('seeds');
        return Promise.resolve();
      });

      await buildService({
        ...admin,
        DB_SEED_ON_STARTUP: true,
      }).onApplicationBootstrap();

      expect(calls).toEqual(['admin', 'seeds']);
    });

    it('propaga falhas para impedir a aplicação de subir', async () => {
      jest
        .mocked(ensureInitialAdmin)
        .mockRejectedValue(new Error('e-mail em uso'));
      await expect(
        buildService(admin).onApplicationBootstrap(),
      ).rejects.toThrow('e-mail em uso');
    });
  });

  describe('seeds de demonstração', () => {
    it('executam quando DB_SEED_ON_STARTUP=true', async () => {
      await buildService({
        DB_SEED_ON_STARTUP: true,
        NODE_ENV: Environment.Development,
        BCRYPT_SALT_ROUNDS: 11,
      }).onApplicationBootstrap();
      expect(runSeeds).toHaveBeenCalledWith(dataSource, 11);
    });

    it('também executam em produção quando habilitados explicitamente', async () => {
      await buildService({
        DB_SEED_ON_STARTUP: true,
        NODE_ENV: Environment.Production,
      }).onApplicationBootstrap();
      expect(runSeeds).toHaveBeenCalledTimes(1);
    });

    it('propagam falhas para impedir a aplicação de subir', async () => {
      jest.mocked(runSeeds).mockRejectedValue(new Error('falha no banco'));
      await expect(
        buildService({ DB_SEED_ON_STARTUP: true }).onApplicationBootstrap(),
      ).rejects.toThrow('falha no banco');
    });
  });
});
