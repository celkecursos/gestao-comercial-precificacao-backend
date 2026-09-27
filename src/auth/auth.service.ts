import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '../common/interfaces/authenticated-user.interface';
import { PasswordService } from '../common/security/password.service';
import { EnvironmentVariables } from '../config/env.validation';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { AuthResponseDto } from './dto/auth-response.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

/**
 * Regras de autenticação e de gerenciamento da própria conta.
 *
 * Futuras funcionalidades de conta (ex.: recuperação de senha por e-mail) devem ser
 * adicionadas neste módulo, reutilizando `UsersService.updatePassword()`.
 */
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordService: PasswordService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async login({ email, password }: LoginDto): Promise<AuthResponseDto> {
    const user = await this.usersService.findByEmailWithPassword(email);
    const passwordMatches =
      !!user && (await this.passwordService.compare(password, user.password));

    if (!user || !passwordMatches) {
      throw new UnauthorizedException('E-mail ou senha inválidos.');
    }
    if (!user.active) {
      throw new UnauthorizedException('Usuário inativo.');
    }

    return this.issueToken(await this.usersService.findOne(user.id));
  }

  /** Invalida todos os tokens emitidos para o usuário (o JWT é stateless). */
  async logout(userId: number): Promise<void> {
    await this.usersService.incrementTokenVersion(userId);
  }

  me(userId: number): Promise<User> {
    return this.usersService.findOne(userId);
  }

  updateProfile(userId: number, dto: UpdateProfileDto): Promise<User> {
    return this.usersService.update(userId, dto, userId);
  }

  /**
   * Altera a senha do usuário autenticado. Os tokens anteriores são invalidados
   * e um novo token é retornado para manter a sessão atual.
   */
  async changePassword(
    userId: number,
    { currentPassword, newPassword }: ChangePasswordDto,
  ): Promise<AuthResponseDto> {
    const user = await this.usersService.findOneWithPassword(userId);

    const currentMatches = await this.passwordService.compare(
      currentPassword,
      user.password,
    );
    if (!currentMatches) {
      throw new BadRequestException('A senha atual está incorreta.');
    }
    if (currentPassword === newPassword) {
      throw new BadRequestException(
        'A nova senha deve ser diferente da senha atual.',
      );
    }

    await this.usersService.updatePassword(userId, newPassword);
    return this.issueToken(await this.usersService.findOne(userId));
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
