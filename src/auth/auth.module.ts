import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SecurityModule } from '../common/security/security.module';
import { EnvironmentVariables } from '../config/env.validation';
import { MailModule } from '../mail/mail.module';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordResetToken } from './entities/password-reset-token.entity';
import { PasswordResetService } from './password-reset.service';
import { FORGOT_PASSWORD_THROTTLE } from './password-reset.throttle';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([PasswordResetToken]),
    UsersModule,
    SecurityModule,
    MailModule,
    ThrottlerModule.forRoot(FORGOT_PASSWORD_THROTTLE),
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => ({
        secret: config.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: config.get('JWT_EXPIRES_IN', {
            infer: true,
          }),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PasswordResetService, JwtStrategy],
})
export class AuthModule {}
