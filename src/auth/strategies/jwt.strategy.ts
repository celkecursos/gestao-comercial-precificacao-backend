import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  AuthenticatedUser,
  JwtPayload,
} from '../../common/interfaces/authenticated-user.interface';
import { EnvironmentVariables } from '../../config/env.validation';
import { UsersService } from '../../users/users.service';

/**
 * Valida o token Bearer de cada requisição. O usuário é recarregado do banco para que
 * desativações, logout e trocas de senha tenham efeito imediato.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<EnvironmentVariables, true>,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('JWT_SECRET', { infer: true }),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findOne(payload.sub).catch(() => null);

    if (!user || !user.active || user.tokenVersion !== payload.tv) {
      throw new UnauthorizedException('Sessão inválida ou expirada.');
    }

    return { id: user.id, name: user.name, email: user.email, role: user.role };
  }
}
