import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { INVALID_RESET_TOKEN_MESSAGE } from '../../src/auth/password-reset.service';
import { MailService } from '../../src/mail/mail.service';
import { createTestApp } from '../support/app';
import {
  bearer,
  login,
  SEED_ADMIN_EMAIL,
  SEED_USER_EMAIL,
} from '../support/auth';
import { stamp } from '../support/data';
import { MailCatcher, resetTokenFrom } from '../support/mail';

const PASSWORD = 'Senha@123';
const NEW_PASSWORD = 'NovaSenha@456';

/**
 * Cobre: `POST /auth/forgot-password` e `POST /auth/reset-password` — matriz de permissão
 * (rotas públicas), resposta igual para e-mail cadastrado ou não, e-mail com o link,
 * redefinição que invalida os JWT, token de uso único e pedido novo invalidando o anterior.
 * O e-mail é capturado pelo `MailCatcher` (troca só a fronteira `MailService`).
 * Não cobre: expiração do token e corrida no consumo (unitário do service); limite de
 * tentativas (`forgot-password-throttle.e2e-spec.ts`).
 * Dado criado: usuários `e2e-<STAMP>-reset-*@empresa.com.br`. Cada caso usa um IP próprio
 * (`X-Forwarded-For`) para não somar no limite por IP.
 */
describe('Auth — recuperação de senha', () => {
  const STAMP = stamp();
  const mail = new MailCatcher();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  const emailOf = (suffix: string) =>
    `e2e-${STAMP}-reset-${suffix}@empresa.com.br`;

  const createUser = async (suffix: string) => {
    const email = emailOf(suffix);
    const { body } = await http()
      .post('/users')
      .set(bearer(adminToken))
      .send({ name: `E2E Reset ${STAMP}`, email, password: PASSWORD })
      .expect(201);
    return { id: (body as { id: number }).id, email };
  };

  const forgot = (email: string, ip: string) =>
    http()
      .post('/auth/forgot-password')
      .set('X-Forwarded-For', ip)
      .send({ email });

  const reset = (token: string, newPassword = NEW_PASSWORD) =>
    http().post('/auth/reset-password').send({ token, newPassword });

  beforeAll(async () => {
    app = await createTestApp((builder) =>
      builder.overrideProvider(MailService).useValue(mail),
    );
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('matriz de permissão (rotas públicas)', () => {
    it.each([
      ['sem token', () => ({})],
      ['USER', () => bearer(userToken)],
      ['ADMIN', () => bearer(adminToken)],
    ])(
      '%s: forgot-password → 204 e reset-password com token inválido → 400',
      async (_profile, headers) => {
        const forgotResponse = await forgot(emailOf('ninguem'), '198.51.100.1')
          .set(headers())
          .expect(204);
        expect(forgotResponse.body).toEqual({});

        const { body } = await reset('token-inexistente')
          .set(headers())
          .expect(400);
        expect(body).toMatchObject({
          statusCode: 400,
          message: INVALID_RESET_TOKEN_MESSAGE,
          path: '/auth/reset-password',
        });
      },
    );
  });

  it('fluxo completo: e-mail com o link, nova senha, JWT antigos invalidados e token de uso único', async () => {
    const { email } = await createUser('fluxo');
    const oldJwt = await login(app, email, PASSWORD);

    // E-mail com maiúsculas e espaços: a API normaliza.
    await forgot(`  ${email.toUpperCase()} `, '198.51.100.2').expect(204);

    const message = await mail.waitFor(email);
    const token = resetTokenFrom(message);
    expect(message.subject).toBe('Redefinição de senha');
    expect(message.text).toContain(`token=${token}`);
    expect(message.html).toContain(`token=${token}`);

    await reset(token).expect(204);

    await http().get('/auth/me').set(bearer(oldJwt)).expect(401);
    await http()
      .post('/auth/login')
      .send({ email, password: PASSWORD })
      .expect(401);
    const { body: session } = await http()
      .post('/auth/login')
      .send({ email, password: NEW_PASSWORD })
      .expect(200);
    expect(session.user).toMatchObject({ email });
    expect(session.user).not.toHaveProperty('password');
    expect(session.user).not.toHaveProperty('tokenVersion');

    const { body } = await reset(token, 'OutraSenha@789').expect(400);
    expect(body).toMatchObject({ message: INVALID_RESET_TOKEN_MESSAGE });
  });

  it('um pedido novo invalida o link anterior', async () => {
    const { email } = await createUser('repetido');

    await forgot(email, '198.51.100.3').expect(204);
    const first = resetTokenFrom(await mail.waitFor(email, 1));
    await forgot(email, '198.51.100.3').expect(204);
    const second = resetTokenFrom(await mail.waitFor(email, 2));

    const { body } = await reset(first).expect(400);
    expect(body).toMatchObject({ message: INVALID_RESET_TOKEN_MESSAGE });
    await reset(second).expect(204);
    await login(app, email, NEW_PASSWORD);
  });

  it('e-mail desconhecido ou de usuário inativo: mesma resposta e nenhum e-mail', async () => {
    const unknown = emailOf('desconhecido');
    const inactive = await createUser('inativo');
    await http()
      .patch(`/users/${inactive.id}/status`)
      .set(bearer(adminToken))
      .send({ active: false })
      .expect(200);
    const active = await createUser('ativo');

    const unknownResponse = await forgot(unknown, '198.51.100.4').expect(204);
    const inactiveResponse = await forgot(
      inactive.email,
      '198.51.100.4',
    ).expect(204);
    const activeResponse = await forgot(active.email, '198.51.100.4').expect(
      204,
    );
    expect(unknownResponse.body).toEqual(activeResponse.body);
    expect(inactiveResponse.body).toEqual(activeResponse.body);

    // Âncora: o pedido do usuário ativo, feito por último, já gerou e-mail.
    await mail.waitFor(active.email);
    expect(mail.to(unknown)).toHaveLength(0);
    expect(mail.to(inactive.email)).toHaveLength(0);
  });

  it('valida o corpo: e-mail inválido e senha fraca → 400', async () => {
    const { body: forgotBody } = await forgot(
      'invalido',
      '198.51.100.5',
    ).expect(400);
    expect(forgotBody).toMatchObject({
      statusCode: 400,
      path: '/auth/forgot-password',
    });
    expect(Array.isArray(forgotBody.message)).toBe(true);

    const { email } = await createUser('senha-fraca');
    await forgot(email, '198.51.100.5').expect(204);
    const token = resetTokenFrom(await mail.waitFor(email));

    const { body } = await reset(token, '123').expect(400);
    expect(Array.isArray(body.message)).toBe(true);

    // A senha fraca não consumiu o token.
    await reset(token).expect(204);
  });
});
