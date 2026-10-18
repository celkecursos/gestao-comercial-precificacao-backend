import 'reflect-metadata';
import { MailDriver, validateEnv } from './env.validation';

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

describe('validateEnv — e-mail e recuperação de senha', () => {
  const base = {
    DB_HOST: '127.0.0.1',
    DB_DATABASE: 'gestao',
    DB_USERNAME: 'gestao',
    JWT_SECRET: 'x'.repeat(32),
  };
  const smtp = {
    MAIL_DRIVER: 'smtp',
    SMTP_HOST: 'smtp.provedor.com',
    SMTP_PORT: '587',
    SMTP_SECURE: 'false',
    SMTP_USER: 'no-reply@empresa.com.br',
    SMTP_PASSWORD: ' segredo com espaço ',
    MAIL_FROM: 'no-reply@empresa.com.br',
    PASSWORD_RESET_URL: 'https://front.uno.com/redefinir-senha',
  };

  it('usa o driver log por padrão, sem exigir SMTP', () => {
    const env = validateEnv(base);
    expect(env.MAIL_DRIVER).toBe(MailDriver.Log);
    expect(env.PASSWORD_RESET_URL).toBeUndefined();
    expect(env.TRUST_PROXY).toBe(1);
  });

  it('aceita a configuração SMTP completa e converte os tipos', () => {
    const env = validateEnv({ ...base, ...smtp });
    expect(env).toMatchObject({
      MAIL_DRIVER: MailDriver.Smtp,
      SMTP_PORT: 587,
      SMTP_SECURE: false,
      SMTP_PASSWORD: ' segredo com espaço ',
    });
  });

  it.each([
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'MAIL_FROM',
    'PASSWORD_RESET_URL',
  ])('com MAIL_DRIVER=smtp, exige %s', (name) => {
    expect(() => validateEnv({ ...base, ...smtp, [name]: '' })).toThrow(name);
  });

  it.each([
    ['porta zero', { SMTP_PORT: '0' }, 'SMTP_PORT'],
    ['porta acima de 65535', { SMTP_PORT: '65536' }, 'SMTP_PORT'],
    ['SMTP_SECURE que não é booleano', { SMTP_SECURE: 'sim' }, 'SMTP_SECURE'],
    ['remetente inválido', { MAIL_FROM: 'no-reply' }, 'MAIL_FROM'],
    [
      'URL sem protocolo',
      { PASSWORD_RESET_URL: 'front.uno.com/x' },
      'PASSWORD_RESET_URL',
    ],
    [
      'URL com outro protocolo',
      { PASSWORD_RESET_URL: 'ftp://front.uno.com' },
      'PASSWORD_RESET_URL',
    ],
    ['driver desconhecido', { MAIL_DRIVER: 'sendgrid' }, 'MAIL_DRIVER'],
  ])('rejeita %s', (_case, override, name) => {
    expect(() => validateEnv({ ...base, ...smtp, ...override })).toThrow(name);
  });

  it.each([
    ['porta 1', { SMTP_PORT: '1' }],
    ['porta 65535', { SMTP_PORT: '65535' }],
    ['URL de localhost', { PASSWORD_RESET_URL: 'http://localhost:5173/x' }],
  ])('aceita %s (borda)', (_case, override) => {
    expect(() => validateEnv({ ...base, ...smtp, ...override })).not.toThrow();
  });

  it('valida PASSWORD_RESET_URL também no driver log, quando informada', () => {
    expect(() =>
      validateEnv({ ...base, PASSWORD_RESET_URL: 'invalida' }),
    ).toThrow('PASSWORD_RESET_URL');
  });

  it('não expõe a senha do SMTP na mensagem de erro', () => {
    let message = '';
    try {
      validateEnv({ ...base, ...smtp, SMTP_HOST: '' });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('SMTP_HOST');
    expect(message).not.toContain('segredo');
  });

  it.each([
    ['-1', false],
    ['0', true],
    ['10', true],
    ['11', false],
  ])('TRUST_PROXY=%s → aceito: %s', (value, accepted) => {
    const call = () => validateEnv({ ...base, TRUST_PROXY: value });
    if (accepted) expect(call).not.toThrow();
    else expect(call).toThrow('TRUST_PROXY');
  });
});
