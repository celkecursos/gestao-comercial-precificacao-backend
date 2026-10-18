import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../support/app';
import {
  bearer,
  login,
  SEED_ADMIN_EMAIL,
  SEED_USER_EMAIL,
} from '../support/auth';
import { stamp } from '../support/data';
import {
  ACCOUNT_PASSWORD,
  createAccount,
  expectNoSecrets,
} from './auth.helpers';

const NEW_PASSWORD = 'NovaSenha@456';

/**
 * Cobre: a própria conta — `PATCH /auth/profile` (nome/e-mail, papel bloqueado, e-mail
 * em uso → 409), `PATCH /auth/password` (senha atual errada, senha igual, troca que
 * invalida o token anterior) e `POST /auth/logout` (invalida o token).
 * Cada caso cria o próprio usuário — os do seed nunca são alterados.
 * Não cobre: força da senha campo a campo (unitário); recuperação por e-mail
 * (`password-reset.e2e-spec.ts`).
 * Dado criado: usuários `e2e-<STAMP>-conta-*@empresa.com.br`.
 */
describe('Auth — conta do próprio usuário', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  const http = () => request(app.getHttpServer());

  const emailOf = (suffix: string) =>
    `e2e-${STAMP}-conta-${suffix}@empresa.com.br`;

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('PATCH /auth/profile atualiza o próprio nome e e-mail', async () => {
    const account = await createAccount(app, adminToken, emailOf('perfil'));
    const newEmail = emailOf('perfil-novo');

    const { body } = await http()
      .patch('/auth/profile')
      .set(bearer(account.token))
      .send({ name: `  E2E Perfil ${STAMP} `, email: newEmail.toUpperCase() })
      .expect(200);
    expect(body).toMatchObject({
      id: account.id,
      name: `E2E Perfil ${STAMP}`,
      email: newEmail,
      role: 'USER',
    });
    expectNoSecrets(body);

    const { body: me } = await http()
      .get('/auth/me')
      .set(bearer(account.token))
      .expect(200);
    expect(me).toMatchObject({ name: `E2E Perfil ${STAMP}`, email: newEmail });
    await login(app, newEmail, ACCOUNT_PASSWORD);
  });

  it('PATCH /auth/profile não permite alterar o papel nem o status (400)', async () => {
    const account = await createAccount(app, adminToken, emailOf('papel'));

    for (const payload of [{ role: 'ADMIN' }, { active: false }]) {
      const { body } = await http()
        .patch('/auth/profile')
        .set(bearer(account.token))
        .send(payload)
        .expect(400);
      expect(body).toMatchObject({ statusCode: 400, path: '/auth/profile' });
      expect(Array.isArray(body.message)).toBe(true);
    }

    const { body: me } = await http()
      .get('/auth/me')
      .set(bearer(account.token))
      .expect(200);
    expect(me).toMatchObject({ role: 'USER', active: true });
  });

  it('PATCH /auth/profile com e-mail de outro usuário → 409', async () => {
    const account = await createAccount(app, adminToken, emailOf('conflito'));

    const { body } = await http()
      .patch('/auth/profile')
      .set(bearer(account.token))
      .send({ email: SEED_USER_EMAIL })
      .expect(409);
    expect(body).toMatchObject({
      statusCode: 409,
      message: 'Já existe um usuário com este e-mail.',
      path: '/auth/profile',
    });
  });

  it('PATCH /auth/password troca a senha, devolve um token novo e invalida o anterior', async () => {
    const account = await createAccount(app, adminToken, emailOf('senha'));

    const { body } = await http()
      .patch('/auth/password')
      .set(bearer(account.token))
      .send({ currentPassword: ACCOUNT_PASSWORD, newPassword: NEW_PASSWORD })
      .expect(200);
    expect(body).toMatchObject({
      accessToken: expect.any(String),
      tokenType: 'Bearer',
      user: { id: account.id, email: account.email },
    });
    expectNoSecrets(body.user);

    // O token anterior deixa de valer; o novo mantém a sessão.
    const { body: expired } = await http()
      .get('/auth/me')
      .set(bearer(account.token))
      .expect(401);
    expect(expired.message).toBe('Sessão inválida ou expirada.');
    await http().get('/auth/me').set(bearer(body.accessToken)).expect(200);

    // Só a senha nova entra.
    await http()
      .post('/auth/login')
      .send({ email: account.email, password: ACCOUNT_PASSWORD })
      .expect(401);
    await login(app, account.email, NEW_PASSWORD);
  });

  it.each([
    [
      'senha atual incorreta',
      { currentPassword: 'Errada@123', newPassword: NEW_PASSWORD },
      'A senha atual está incorreta.',
    ],
    [
      'nova senha igual à atual',
      { currentPassword: ACCOUNT_PASSWORD, newPassword: ACCOUNT_PASSWORD },
      'A nova senha deve ser diferente da senha atual.',
    ],
  ])(
    'PATCH /auth/password com %s → 400 e a senha não muda',
    async (suffix, payload, message) => {
      const account = await createAccount(
        app,
        adminToken,
        emailOf(suffix.replace(/\W+/g, '-')),
      );

      const { body } = await http()
        .patch('/auth/password')
        .set(bearer(account.token))
        .send(payload)
        .expect(400);
      expect(body).toMatchObject({
        statusCode: 400,
        message,
        path: '/auth/password',
      });

      await http().get('/auth/me').set(bearer(account.token)).expect(200);
      await login(app, account.email, ACCOUNT_PASSWORD);
    },
  );

  it('PATCH /auth/password com senha fraca → 400 com lista de mensagens', async () => {
    const account = await createAccount(app, adminToken, emailOf('fraca'));

    const { body } = await http()
      .patch('/auth/password')
      .set(bearer(account.token))
      .send({ currentPassword: ACCOUNT_PASSWORD, newPassword: '123' })
      .expect(400);
    expect(Array.isArray(body.message)).toBe(true);
  });

  it('POST /auth/logout invalida o token e um novo login volta a funcionar', async () => {
    const account = await createAccount(app, adminToken, emailOf('logout'));

    await http().post('/auth/logout').set(bearer(account.token)).expect(204);

    const { body } = await http()
      .get('/auth/me')
      .set(bearer(account.token))
      .expect(401);
    expect(body).toMatchObject({
      statusCode: 401,
      message: 'Sessão inválida ou expirada.',
    });

    const token = await login(app, account.email, ACCOUNT_PASSWORD);
    await http().get('/auth/me').set(bearer(token)).expect(200);
  });
});
