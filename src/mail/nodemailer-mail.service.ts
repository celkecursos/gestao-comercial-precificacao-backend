import { Logger } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import { EnvironmentVariables, MailDriver } from '../config/env.validation';
import { MailMessage, MailService } from './mail.service';

export const DEFAULT_MAIL_FROM_NAME = 'Gestão Comercial e Precificação';

type MailEnv = Pick<
  EnvironmentVariables,
  | 'MAIL_DRIVER'
  | 'SMTP_HOST'
  | 'SMTP_PORT'
  | 'SMTP_SECURE'
  | 'SMTP_USER'
  | 'SMTP_PASSWORD'
  | 'MAIL_FROM'
  | 'MAIL_FROM_NAME'
>;

/**
 * Envio de e-mail com nodemailer. O provedor (Hostinger, SES, Mailgun...) muda só pelas
 * variáveis SMTP_* — não há código específico de provedor.
 * - driver `smtp`: entrega pelo servidor SMTP;
 * - driver `log`: não entrega; registra destinatário, assunto e texto no log.
 */
export class NodemailerMailService extends MailService {
  private readonly logger = new Logger(NodemailerMailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly env: MailEnv) {
    super();
    this.transporter =
      env.MAIL_DRIVER === MailDriver.Smtp
        ? createTransport({
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
          })
        : createTransport({ jsonTransport: true });
  }

  async send(message: MailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: this.env.MAIL_FROM
        ? {
            name: this.env.MAIL_FROM_NAME ?? DEFAULT_MAIL_FROM_NAME,
            address: this.env.MAIL_FROM,
          }
        : undefined,
      ...message,
    });

    if (this.env.MAIL_DRIVER === MailDriver.Log) {
      this.logger.log(
        `[MAIL_DRIVER=log] E-mail não enviado.\nPara: ${message.to}\nAssunto: ${message.subject}\n\n${message.text}`,
      );
    }
  }
}
