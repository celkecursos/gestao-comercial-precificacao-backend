import 'reflect-metadata';
import { validateEnv } from './env.validation';

describe('validateEnv — administrador inicial', () => {
  const base = {
    DB_HOST: '127.0.0.1',
    DB_DATABASE: 'gestao',
    DB_USERNAME: 'gestao',
    JWT_SECRET: 'x'.repeat(32),
  };
  const admin = {
    ADMIN_NAME: 'Admin',
    ADMIN_EMAIL: ' Admin@Empresa.com.br ',
    ADMIN_PASSWORD: 'SenhaForte@2026',
  };

  it('aceita a configuração sem as variáveis ADMIN_*', () => {
    const env = validateEnv(base);
    expect(env.ADMIN_EMAIL).toBeUndefined();
  });

  it('trata variáveis vazias como não informadas', () => {
    const env = validateEnv({
      ...base,
      ADMIN_NAME: '',
      ADMIN_EMAIL: ' ',
      ADMIN_PASSWORD: '',
    });
    expect(env.ADMIN_NAME).toBeUndefined();
  });

  it('aceita as três variáveis e normaliza o e-mail', () => {
    const env = validateEnv({ ...base, ...admin });
    expect(env.ADMIN_EMAIL).toBe('admin@empresa.com.br');
  });

  it('exige as três variáveis quando uma delas é informada', () => {
    expect(() =>
      validateEnv({ ...base, ADMIN_EMAIL: 'admin@empresa.com.br' }),
    ).toThrow('ADMIN_NAME');
  });

  it('aplica a política de senha forte', () => {
    expect(() =>
      validateEnv({ ...base, ...admin, ADMIN_PASSWORD: 'fraca123' }),
    ).toThrow('ADMIN_PASSWORD');
  });

  it('não expõe a senha na mensagem de erro', () => {
    const weak = 'senhafraca99';
    let message = '';
    try {
      validateEnv({ ...base, ...admin, ADMIN_PASSWORD: weak });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('ADMIN_PASSWORD');
    expect(message).not.toContain(weak);
  });

  it('rejeita e-mail inválido', () => {
    expect(() =>
      validateEnv({ ...base, ...admin, ADMIN_EMAIL: 'invalido' }),
    ).toThrow('ADMIN_EMAIL');
  });
});
