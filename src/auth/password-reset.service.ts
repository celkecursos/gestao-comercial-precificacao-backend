import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import {
  DEFAULT_PASSWORD_RESET_URL,
  EnvironmentVariables,
} from '../config/env.validation';
import { MailService } from '../mail/mail.service';
import { UsersService } from '../users/users.service';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { buildPasswordResetMail } from './mail/password-reset.mail';

/** Validade do link de redefinição. */
export const PASSWORD_RESET_TTL_MINUTES = 60;

export const INVALID_RESET_TOKEN_MESSAGE =
  'Link de redefinição inválido ou expirado. Solicite um novo.';

export const hashResetToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

/**
 * Recuperação de senha por e-mail: emite o token, envia o link e redefine a senha.
 * A senha é gravada por `UsersService.updatePassword()`, que também invalida os JWT.
 */
@Injectable()
export class PasswordResetService {
  private readonly logger = new Logger(PasswordResetService.name);

  constructor(
    @InjectRepository(PasswordResetToken)
    private readonly tokensRepository: Repository<PasswordResetToken>,
    private readonly usersService: UsersService,
    private readonly mailService: MailService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  /**
   * Inicia o pedido sem esperar por ele e sem falhar: a resposta (e o tempo dela) é a
   * mesma exista ou não o usuário, para não revelar quais e-mails estão cadastrados.
   */
  requestReset(email: string): void {
    this.sendResetLink(email).catch((error: unknown) => {
      this.logger.error(
        'Falha ao processar um pedido de redefinição de senha.',
        error instanceof Error ? error.stack : String(error),
      );
    });
  }

  /**
   * Gera um novo token para o usuário ativo com este e-mail, invalida os pedidos anteriores
   * e envia o link. E-mail desconhecido ou usuário inativo: não faz nada.
   */
  async sendResetLink(email: string): Promise<void> {
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.active) return;

    const token = randomBytes(32).toString('base64url');

    await this.tokensRepository.delete({ userId: user.id });
    await this.tokensRepository.save(
      this.tokensRepository.create({
        userId: user.id,
        tokenHash: hashResetToken(token),
        expiresAt: new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60_000),
        usedAt: null,
      }),
    );

    await this.mailService.send(
      buildPasswordResetMail({
        to: user.email,
        name: user.name,
        link: this.buildResetLink(token),
        expiresInMinutes: PASSWORD_RESET_TTL_MINUTES,
      }),
    );
  }

  /** Redefine a senha com um token válido, não expirado e ainda não usado. */
  async resetPassword({ token, newPassword }: ResetPasswordDto): Promise<void> {
    const now = new Date();
    const record = await this.tokensRepository.findOneBy({
      tokenHash: hashResetToken(token),
    });
    if (!record || record.usedAt || record.expiresAt <= now) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    const user = await this.usersService.findOne(record.userId);
    if (!user.active) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    // Marca o uso de forma atômica: dois pedidos simultâneos não usam o mesmo token.
    const { affected } = await this.tokensRepository.update(
      { id: record.id, usedAt: IsNull() },
      { usedAt: now },
    );
    if (affected !== 1) {
      throw new BadRequestException(INVALID_RESET_TOKEN_MESSAGE);
    }

    await this.usersService.updatePassword(user.id, newPassword);
  }

  private buildResetLink(token: string): string {
    const url = new URL(
      this.config.get('PASSWORD_RESET_URL', { infer: true }) ??
        DEFAULT_PASSWORD_RESET_URL,
    );
    url.searchParams.set('token', token);
    return url.toString();
  }
}
