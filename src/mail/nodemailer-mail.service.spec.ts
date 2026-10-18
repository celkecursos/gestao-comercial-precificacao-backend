import { Logger } from '@nestjs/common';
import { createTransport } from 'nodemailer';
import { MailDriver } from '../config/env.validation';
import {
  DEFAULT_MAIL_FROM_NAME,
  NodemailerMailService,
} from './nodemailer-mail.service';

jest.mock('nodemailer', () => ({ createTransport: jest.fn() }));

describe('NodemailerMailService', () => {
  const sendMail = jest.fn().mockResolvedValue({});
  const message = {
    to: 'kelly@celke.com.br',
    subject: 'Redefinição de senha',
    html: '<p>Olá</p>',
    text: 'Olá',
  };
  const smtpEnv = {
    MAIL_DRIVER: MailDriver.Smtp,
    SMTP_HOST: 'smtp.provedor.com',
    SMTP_PORT: 465,
    SMTP_SECURE: true,
    SMTP_USER: 'no-reply@empresa.com.br',
    SMTP_PASSWORD: 'segredo',
    MAIL_FROM: 'no-reply@empresa.com.br',
    MAIL_FROM_NAME: 'Empresa',
  };

  beforeEach(() => {
    jest
      .mocked(createTransport)
      .mockReset()
      .mockReturnValue({
        sendMail,
      } as unknown as ReturnType<typeof createTransport>);
    sendMail.mockClear();
  });

  it('driver smtp: conecta ao servidor só com as variáveis SMTP_*', () => {
    new NodemailerMailService(smtpEnv);

    expect(createTransport).toHaveBeenCalledWith({
      host: 'smtp.provedor.com',
      port: 465,
      secure: true,
      auth: { user: 'no-reply@empresa.com.br', pass: 'segredo' },
    });
  });

  it('driver smtp: envia com o remetente de MAIL_FROM e MAIL_FROM_NAME', async () => {
    await new NodemailerMailService(smtpEnv).send(message);

    expect(sendMail).toHaveBeenCalledWith({
      from: { name: 'Empresa', address: 'no-reply@empresa.com.br' },
      ...message,
    });
  });

  it('usa o nome padrão quando MAIL_FROM_NAME não é informado', async () => {
    await new NodemailerMailService({
      ...smtpEnv,
      MAIL_FROM_NAME: undefined,
    }).send(message);

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: {
          name: DEFAULT_MAIL_FROM_NAME,
          address: 'no-reply@empresa.com.br',
        },
      }),
    );
  });

  it('driver log: não usa SMTP e registra o e-mail no log', async () => {
    const log = jest
      .spyOn(Logger.prototype, 'log')
      .mockImplementation(() => undefined);

    await new NodemailerMailService({ MAIL_DRIVER: MailDriver.Log }).send(
      message,
    );

    expect(createTransport).toHaveBeenCalledWith({ jsonTransport: true });
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Para: kelly@celke.com.br'),
    );
    log.mockRestore();
  });
});
