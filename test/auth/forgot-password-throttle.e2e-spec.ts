import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import {
  FORGOT_PASSWORD_LIMIT_PER_EMAIL,
  FORGOT_PASSWORD_LIMIT_PER_IP,
  FORGOT_PASSWORD_THROTTLED_MESSAGE,
} from '../../src/auth/password-reset.throttle';
import { MailService } from '../../src/mail/mail.service';
import { createTestApp } from '../support/app';
import { stamp } from '../support/data';
import { MailCatcher } from '../support/mail';

/**
 * Cobre: limite de tentativas de `POST /auth/forgot-password` por IP real (vindo do
 * `X-Forwarded-For` do proxy, TRUST_PROXY=1) e por e-mail (sem diferenciar maiúsculas).
 * Não cobre: o envio em si (`password-reset.e2e-spec.ts`).
 * Dado criado: nenhum — usa e-mails `e2e-<STAMP>-limite-*` que não existem.
 * Os contadores ficam em memória: este arquivo sobe o próprio app, então começa do zero.
 */
describe('Auth — limite de pedidos de redefinição de senha', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  const forgot = (email: string, ip: string) =>
    http()
      .post('/auth/forgot-password')
      .set('X-Forwarded-For', ip)
      .send({ email });

  const expectThrottled = async (response: request.Test) => {
    const { body } = await response.expect(429);
    expect(body).toMatchObject({
      statusCode: 429,
      message: FORGOT_PASSWORD_THROTTLED_MESSAGE,
      path: '/auth/forgot-password',
    });
  };

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(MailService).useValue(new MailCatcher()),
    );
  });

  afterAll(async () => {
    await app.close();
  });

  it(`por IP: ${FORGOT_PASSWORD_LIMIT_PER_IP} pedidos passam, o seguinte recebe 429; outro IP segue livre`, async () => {
    const ip = '203.0.113.10';
    for (let i = 1; i <= FORGOT_PASSWORD_LIMIT_PER_IP; i++) {
      await forgot(`e2e-${STAMP}-limite-ip-${i}@empresa.com.br`, ip).expect(
        204,
      );
    }

    await expectThrottled(
      forgot(`e2e-${STAMP}-limite-ip-extra@empresa.com.br`, ip),
    );
    await forgot(
      `e2e-${STAMP}-limite-ip-extra@empresa.com.br`,
      '203.0.113.11',
    ).expect(204);
  });

  it(`por e-mail: ${FORGOT_PASSWORD_LIMIT_PER_EMAIL} pedidos passam mesmo de IPs diferentes, o seguinte recebe 429`, async () => {
    const email = `e2e-${STAMP}-limite-email@empresa.com.br`;
    for (let i = 1; i <= FORGOT_PASSWORD_LIMIT_PER_EMAIL; i++) {
      // Variações de caixa contam como o mesmo e-mail.
      const variant = i % 2 === 0 ? email.toUpperCase() : email;
      await forgot(variant, `203.0.113.${20 + i}`).expect(204);
    }

    await expectThrottled(forgot(email, '203.0.113.30'));
    await forgot(
      `e2e-${STAMP}-limite-outro@empresa.com.br`,
      '203.0.113.30',
    ).expect(204);
  });
});
