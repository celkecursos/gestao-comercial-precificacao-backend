import { plainToInstance, Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
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

export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

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

  @IsString()
  @IsNotEmpty()
  FRONTEND_RESET_PASSWORD_URL = 'http://localhost:5173/reset-password';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1440)
  PASSWORD_RESET_TOKEN_TTL_MINUTES = 30;

  @Transform(optionalText)
  @ValidateIf(
    (env: EnvironmentVariables) =>
      Boolean(env.SMTP_HOST) || env.NODE_ENV === Environment.Production,
  )
  @IsString()
  @IsNotEmpty()
  SMTP_HOST?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65535)
  SMTP_PORT = 587;

  @Transform(toBoolean)
  @IsBoolean()
  SMTP_SECURE = false;

  @Transform(optionalText)
  @ValidateIf(
    (env: EnvironmentVariables) =>
      Boolean(env.SMTP_HOST) || env.NODE_ENV === Environment.Production,
  )
  @IsString()
  @IsNotEmpty()
  SMTP_USER?: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' && value !== '' ? value : undefined,
  )
  @ValidateIf(
    (env: EnvironmentVariables) =>
      Boolean(env.SMTP_HOST) || env.NODE_ENV === Environment.Production,
  )
  @IsString()
  @IsNotEmpty()
  SMTP_PASSWORD?: string;

  @Transform(optionalText)
  @ValidateIf(
    (env: EnvironmentVariables) =>
      Boolean(env.SMTP_HOST) || env.NODE_ENV === Environment.Production,
  )
  @IsString()
  @IsNotEmpty()
  SMTP_FROM?: string;

  @Transform(toBoolean)
  @IsBoolean()
  SWAGGER_ENABLED = true;
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
