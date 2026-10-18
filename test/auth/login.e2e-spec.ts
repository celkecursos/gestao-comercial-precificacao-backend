import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { DEMO_PASSWORD } from '../../src/database/seeds/seed-data';
import { createTestApp } from '../support/app';
import {
  bearer,
  login,
  SEED_ADMIN_EMAIL,
  SEED_USER_EMAIL,
} from '../support/auth';
import { expectNoSecrets } from './auth.helpers';

/**
 * Cobre: `POST /auth/login` (rota pública) — login dos perfis do seed com o formato da
 * resposta, token aceito nas rotas privadas, e-mail normalizado, credenciais inválidas
 * (401 com a mesma mensagem) e validação ligada (400).
 * Não cobre: usuário inativo (`users/crud.e2e-spec.ts`); emissão do JWT (unitário).
 * Dado criado: nenhum.
 */
describe('Auth — login', () => {
  let app: INestApplication<App>;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['ADMIN', SEED_ADMIN_EMAIL],
    ['USER', SEED_USER_EMAIL],
  ])(
    'faz login como %s e o token abre as rotas privadas',
    async (role, email) => {
      const { body } = await http()
        .post('/auth/login')
        .send({ email, password: DEMO_PASSWORD })
        .expect(200);

      expect(body).toMatchObject({
        accessToken: expect.any(String),
        tokenType: 'Bearer',
        expiresIn: expect.any(String),
        user: { email, role, active: true },
      });
      expectNoSecrets(body.user);

      const { body: me } = await http()
        .get('/auth/me')
        .set(bearer(body.accessToken))
        .expect(200);
      expect(me).toMatchObject({ email, role });
    },
  );

  it('é pública: com token de USER ou ADMIN responde igual', async () => {
    for (const email of [SEED_USER_EMAIL, SEED_ADMIN_EMAIL]) {
      const token = await login(app, email);
      const { body } = await http()
        .post('/auth/login')
        .set(bearer(token))
        .send({ email, password: DEMO_PASSWORD })
        .expect(200);
      expect(body.user.email).toBe(email);
    }
  });

  it('normaliza o e-mail (espaços e maiúsculas)', async () => {
    const { body } = await http()
      .post('/auth/login')
      .send({
        email: `  ${SEED_USER_EMAIL.toUpperCase()} `,
        password: DEMO_PASSWORD,
      })
      .expect(200);
    expect(body.user.email).toBe(SEED_USER_EMAIL);
  });

  it.each([
    ['senha errada', SEED_ADMIN_EMAIL, 'errada'],
    ['e-mail não cadastrado', 'e2e-ninguem@empresa.com.br', DEMO_PASSWORD],
  ])('%s → 401 com a mesma mensagem', async (_, email, password) => {
    const { body } = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(401);
    expect(body).toMatchObject({
      statusCode: 401,
      error: expect.any(String),
      message: 'E-mail ou senha inválidos.',
      path: '/auth/login',
      timestamp: expect.any(String),
    });
  });

  it('valida o corpo (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .post('/auth/login')
      .send({ email: 'invalido' })
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: '/auth/login' });
    expect(Array.isArray(body.message)).toBe(true);
  });
});
