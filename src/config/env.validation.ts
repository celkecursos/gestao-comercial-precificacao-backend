import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  IsUrl,
  Length,
  Matches,
  Max,
  Min,
  MinLength,
  ValidateIf,
  validateSync,
} from 'class-validator';
import { toBoolean } from '../common/transformers/to-boolean.transformer';
import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_PATTERN,
  PASSWORD_PATTERN_MESSAGE,
} from '../common/validators/password.rules';

/** Textos vazios contam como "não informado"; os demais são aparados. */
const optionalText = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;

/** As variáveis ADMIN_* são tratadas em conjunto: se uma for informada, todas são exigidas. */
const hasInitialAdmin = (env: EnvironmentVariables) =>
  Boolean(env.ADMIN_NAME || env.ADMIN_EMAIL || env.ADMIN_PASSWORD);

/** Segredos não são aparados (um espaço pode fazer parte da senha); vazio conta como "não informado". */
const optionalSecret = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value !== '' ? value : undefined;

/** Número opcional: vazio conta como "não informado"; o restante é convertido para o validador conferir. */
const optionalNumber = ({ value }: { value: unknown }) =>
  value === undefined || value === '' ? undefined : Number(value);

/** Com MAIL_DRIVER=smtp, as variáveis SMTP_* e MAIL_FROM são obrigatórias. */
const usesSmtp = (env: EnvironmentVariables) =>
  env.MAIL_DRIVER === MailDriver.Smtp;

const requiredForSmtp = (name: string) =>
  `${name} é obrigatório quando MAIL_DRIVER=smtp.`;

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

/**
 * Como os e-mails são entregues:
 * - `log`: não envia; registra o e-mail no log da aplicação (desenvolvimento, testes e CI);
 * - `smtp`: envia pelo servidor SMTP configurado em SMTP_* (homolog e produção).
 */
export enum MailDriver {
  Log = 'log',
  Smtp = 'smtp',
}

/** Endereço da tela de redefinição de senha usado quando PASSWORD_RESET_URL não é informado (driver `log`). */
export const DEFAULT_PASSWORD_RESET_URL =
  'http://localhost:5173/redefinir-senha';

/**
 * Todas as variáveis de ambiente aceitas pela aplicação.
 * Ao adicionar uma nova variável, declare-a aqui e no arquivo .env.example.
 */
export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment = Environment.Development;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

  /** Lista de origens permitidas no CORS, separadas por vírgula. */
  @IsString()
  @IsNotEmpty()
  FRONTEND_URL = 'http://localhost:5173';

  @IsString()
  @IsNotEmpty()
  DB_HOST: string;

  @Type(() => Number)
  @IsInt()
  DB_PORT = 3306;

  @IsString()
  @IsNotEmpty()
  DB_DATABASE: string;

  @IsString()
  @IsNotEmpty()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD = '';

  @Transform(toBoolean)
  @IsBoolean()
  DB_LOGGING = false;

  /** Executa migrations pendentes automaticamente ao iniciar a aplicação. */
  @Transform(toBoolean)
  @IsBoolean()
  DB_MIGRATIONS_RUN = false;

  /**
   * Executa os seeds (idempotentes) ao iniciar a aplicação, após as migrations.
   * Indicado para os ambientes develop e homolog; mantenha desligado em produção.
   */
  @Transform(toBoolean)
  @IsBoolean()
  DB_SEED_ON_STARTUP = false;

  /**
   * Administrador inicial (opcional). Ao iniciar, se ainda não existir nenhum ADMIN no banco,
   * este usuário é criado. Se já existir um ADMIN, as variáveis são ignoradas e a senha nunca
   * é sobrescrita. Indicado para o primeiro acesso em produção, sem dados de demonstração.
   */
  @Transform(optionalText)
  @ValidateIf(hasInitialAdmin)
  @IsString({
    message:
      'ADMIN_NAME é obrigatório quando o administrador inicial é configurado.',
  })
  @Length(2, 120, { message: 'ADMIN_NAME deve ter entre 2 e 120 caracteres.' })
  ADMIN_NAME?: string;

  @Transform(({ value }) => {
    const text = optionalText({ value });
    return typeof text === 'string' ? text.toLowerCase() : text;
  })
  @ValidateIf(hasInitialAdmin)
  @IsEmail({}, { message: 'ADMIN_EMAIL deve ser um e-mail válido.' })
  ADMIN_EMAIL?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== '' ? value : undefined,
  )
  @ValidateIf(hasInitialAdmin)
  @IsString({
    message:
      'ADMIN_PASSWORD é obrigatório quando o administrador inicial é configurado.',
  })
  @Length(PASSWORD_MIN_LENGTH, PASSWORD_MAX_LENGTH, {
    message: `ADMIN_PASSWORD deve ter entre ${PASSWORD_MIN_LENGTH} e ${PASSWORD_MAX_LENGTH} caracteres.`,
  })
  @Matches(PASSWORD_PATTERN, {
    message: `ADMIN_PASSWORD: ${PASSWORD_PATTERN_MESSAGE}`,
  })
  ADMIN_PASSWORD?: string;

  @IsString()
  @MinLength(32, { message: 'JWT_SECRET deve ter no mínimo 32 caracteres.' })
  JWT_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_EXPIRES_IN = '1d';

  @Type(() => Number)
  @IsInt()
  @Min(10)
  @Max(15)
  BCRYPT_SALT_ROUNDS = 10;

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED = true;

  /**
   * Quantos proxies reversos ficam entre o cliente e a API (Express `trust proxy`).
   * Com 1 (padrão — o proxy da hospedagem), o IP do cliente vem do `X-Forwarded-For`
   * adicionado por esse proxy; é o IP usado no limite de tentativas. 0 = sem proxy.
   */
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10)
  TRUST_PROXY = 1;

  @IsEnum(MailDriver, { message: 'MAIL_DRIVER deve ser "log" ou "smtp".' })
  MAIL_DRIVER: MailDriver = MailDriver.Log;

  @Transform(optionalText)
  @ValidateIf(usesSmtp)
  @IsString({ message: requiredForSmtp('SMTP_HOST') })
  SMTP_HOST?: string;

  @Transform(optionalNumber)
  @ValidateIf(usesSmtp)
  @IsInt({ message: requiredForSmtp('SMTP_PORT') })
  @Min(1)
  @Max(65535)
  SMTP_PORT?: number;

  /** `true` para TLS direto (porta 465); `false` para STARTTLS (porta 587). */
  @Transform((params) => toBoolean({ ...params, value: optionalText(params) }))
  @ValidateIf(usesSmtp)
  @IsBoolean({
    message: `${requiredForSmtp('SMTP_SECURE')} Use true ou false.`,
  })
  SMTP_SECURE?: boolean;

  @Transform(optionalText)
  @ValidateIf(usesSmtp)
  @IsString({ message: requiredForSmtp('SMTP_USER') })
  SMTP_USER?: string;

  @Transform(optionalSecret)
  @ValidateIf(usesSmtp)
  @IsString({ message: requiredForSmtp('SMTP_PASSWORD') })
  SMTP_PASSWORD?: string;

  /** Endereço do remetente dos e-mails. */
  @Transform(optionalText)
  @ValidateIf(
    (env: EnvironmentVariables) => usesSmtp(env) || env.MAIL_FROM !== undefined,
  )
  @IsEmail(
    {},
    {
      message:
        'MAIL_FROM deve ser um e-mail válido (obrigatório quando MAIL_DRIVER=smtp).',
    },
  )
  MAIL_FROM?: string;

  /** Nome exibido como remetente. */
  @Transform(optionalText)
  @ValidateIf((env: EnvironmentVariables) => env.MAIL_FROM_NAME !== undefined)
  @Length(1, 120, {
    message: 'MAIL_FROM_NAME deve ter entre 1 e 120 caracteres.',
  })
  MAIL_FROM_NAME?: string;

  /**
   * Endereço da tela do frontend que recebe o token (`?token=...`) e define a nova senha.
   * Obrigatório com MAIL_DRIVER=smtp; com `log`, o padrão é DEFAULT_PASSWORD_RESET_URL.
   */
  @Transform(optionalText)
  @ValidateIf(
    (env: EnvironmentVariables) =>
      usesSmtp(env) || env.PASSWORD_RESET_URL !== undefined,
  )
  @IsUrl(
    {
      require_tld: false,
      require_protocol: true,
      protocols: ['http', 'https'],
    },
    {
      message:
        'PASSWORD_RESET_URL deve ser uma URL http(s) válida (obrigatória quando MAIL_DRIVER=smtp).',
    },
  )
  PASSWORD_RESET_URL?: string;
}

export function validateEnv(
  config: Record<string, unknown>,
): EnvironmentVariables {
  const validated = plainToInstance(EnvironmentVariables, config);
  const errors = validateSync(validated, { skipMissingProperties: false });

  if (errors.length > 0) {
    const details = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n - ');
    throw new Error(`Variáveis de ambiente inválidas:\n - ${details}`);
  }

  return validated;
}
