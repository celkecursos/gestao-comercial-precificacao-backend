import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'node:crypto';
import { IsNull, Repository } from 'typeorm';
import { JwtPayload } from '../common/interfaces/authenticated-user.interface';
import { PasswordService } from '../common/security/password.service';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { EmailService } from './email.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';

export const FORGOT_PASSWORD_MESSAGE =
  'Se o e-mail estiver cadastrado e ativo, enviaremos as instruções para redefinir a senha.';

@Injectable()
export class AuthService {
  private readonly forgotAttempts = new Map<string, number[]>();

  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
    @InjectRepository(PasswordResetToken)
    private readonly resetTokens: Repository<PasswordResetToken>,
    private readonly emailService: EmailService,
  ) {}

  async login({ email, password }: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(email);
    const passwordMatches =
      !!user && (await this.passwordService.compare(password, user.password));
    if (!user || !passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!user.active) throw new UnauthorizedException('Usuário inativo.');
    return this.issueToken(await this.usersService.findOne(user.id));
  }

  async logout(userId: number): Promise<void> {
    await this.usersService.incrementTokenVersion(userId);
  }

  me(userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    return this.usersService.update(userId, dto, userId);
  }

  async changePassword(
    userId: number,
    { currentPassword, newPassword }: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findOneWithPassword(userId);
    const currentMatches = await this.passwordService.compare(
      currentPassword,
      user.password,
    );
    if (!currentMatches)
      throw new BadRequestException('A senha atual está incorreta.');
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }
    await this.usersService.updatePassword(userId, newPassword);
    return this.issueToken(await this.usersService.findOne(userId));
  }

  async forgotPassword(
    email: string,
    ip: string,
  ): Promise<{ message: string }> {
    this.checkForgotPasswordRateLimit(email, ip);
    const user = await this.usersService.findByEmail(email);
    if (!user?.active) return { message: FORGOT_PASSWORD_MESSAGE };

    await this.resetTokens.update(
      { userId: user.id, usedAt: IsNull() },
      { usedAt: new Date() },
    );
    const token = randomBytes(32).toString('base64url');
    const ttl = this.config.get('PASSWORD_RESET_TOKEN_TTL_MINUTES', {
      infer: true,
    });
    await this.resetTokens.save(
      this.resetTokens.create({
        userId: user.id,
        tokenHash: this.hashToken(token),
        expiresAt: new Date(Date.now() + ttl * 60_000),
        usedAt: null,
      }),
    );
    const baseUrl = this.config.get('FRONTEND_RESET_PASSWORD_URL', {
      infer: true,
    });
    await this.emailService.sendPasswordReset(
      user.email,
      `${baseUrl}?token=${encodeURIComponent(token)}`,
    );
    return { message: FORGOT_PASSWORD_MESSAGE };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const record = await this.resetTokens.findOneBy({
      tokenHash: this.hashToken(token),
    });
    if (!record)
      throw new BadRequestException('Token de recuperação inválido.');
    if (record.usedAt) {
      throw new BadRequestException('Token de recuperação já utilizado.');
    }
    if (record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException('Token de recuperação expirado.');
    }
    await this.usersService.updatePassword(record.userId, newPassword);
    record.usedAt = new Date();
    await this.resetTokens.save(record);
    return { message: 'Senha redefinida com sucesso.' };
  }

  private checkForgotPasswordRateLimit(email: string, ip: string): void {
    const now = Date.now();
    const windowMs = 15 * 60_000;
    for (const key of [`email:${email}`, `ip:${ip}`]) {
      const attempts = (this.forgotAttempts.get(key) ?? []).filter(
        (time) => now - time < windowMs,
      );
      if (attempts.length >= 5) {
        throw new HttpException(
          'Muitas solicitações de recuperação. Tente novamente mais tarde.',
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      attempts.push(now);
      this.forgotAttempts.set(key, attempts);
    }
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  private async issueToken(user: User): Promise<AuthResponseDto> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tv: user.tokenVersion,
    };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      tokenType: 'Bearer',
      expiresIn: this.config.get('JWT_EXPIRES_IN', { infer: true }),
      user,
    };
  }
}
