import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  Environment,
  EnvironmentVariables,
  MailDriver,
} from '../config/env.validation';
import { MailService } from './mail.service';
import { NodemailerMailService } from './nodemailer-mail.service';

@Module({
  providers: [
    {
      provide: MailService,
      inject: [ConfigService],
      useFactory: (config: ConfigService<EnvironmentVariables, true>) => {
        const driver = config.get('MAIL_DRIVER', { infer: true });
        if (
          driver === MailDriver.Log &&
          config.get('NODE_ENV', { infer: true }) === Environment.Production
        ) {
          new Logger(MailModule.name).warn(
            'MAIL_DRIVER=log em produção: nenhum e-mail será entregue. Configure MAIL_DRIVER=smtp.',
          );
        }

        return new NodemailerMailService({
          MAIL_DRIVER: driver,
          SMTP_HOST: config.get('SMTP_HOST', { infer: true }),
          SMTP_PORT: config.get('SMTP_PORT', { infer: true }),
          SMTP_SECURE: config.get('SMTP_SECURE', { infer: true }),
          SMTP_USER: config.get('SMTP_USER', { infer: true }),
          SMTP_PASSWORD: config.get('SMTP_PASSWORD', { infer: true }),
          MAIL_FROM: config.get('MAIL_FROM', { infer: true }),
          MAIL_FROM_NAME: config.get('MAIL_FROM_NAME', { infer: true }),
        });
      },
    },
  ],
  exports: [MailService],
})
export class MailModule {}
