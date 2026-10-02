import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { EnvironmentVariables } from '../config/env.validation';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly config: ConfigService<EnvironmentVariables, true>,
  ) {}

  async sendPasswordReset(email: string, link: string): Promise<void> {
    const host = this.config.get('SMTP_HOST', { infer: true });
    if (!host) {
      this.logger.log(`Link de recuperação para ${email}: ${link}`);
      return;
    }
    const user = this.config.get('SMTP_USER', { infer: true });
    const password = this.config.get('SMTP_PASSWORD', { infer: true });
    const transporter = nodemailer.createTransport({
      host,
      port: this.config.get('SMTP_PORT', { infer: true }),
      secure: this.config.get('SMTP_SECURE', { infer: true }),
      auth: user && password ? { user, pass: password } : undefined,
    });
    await transporter.sendMail({
      from: this.config.get('SMTP_FROM', { infer: true }),
      to: email,
      subject: 'Redefinição de senha',
      text: `Use este link para redefinir sua senha: ${link}`,
      html: `<p>Use o link abaixo para redefinir sua senha:</p><p><a href="${link}">${link}</a></p>`,
    });
  }
}
