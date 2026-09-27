import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EnvironmentVariables } from '../../config/env.validation';
import { PasswordService } from './password.service';

@Module({
  providers: [
    {
      provide: PasswordService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) =>
        new PasswordService(config.get('BCRYPT_SALT_ROUNDS', { infer: true })),
    },
  ],
  exports: [PasswordService],
})
export class SecurityModule {}
