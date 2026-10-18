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

type Card = { key: string; title: string; value: number };

/**
 * Cobre: matriz de permissão de `GET /dashboard`, o formato dos quatro cards e que o
 * card de usuários acompanha um cadastro (delta, nunca valor absoluto).
 * Não cobre: a agregação em si (unitário do service).
 * Dado criado: usuário `e2e-<STAMP>-dashboard@empresa.com.br`.
 */
describe('Dashboard — resumo', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  const values = async (token: string) => {
    const { body } = await http()
      .get('/dashboard')
      .set(bearer(token))
      .expect(200);
    return Object.fromEntries(
      (body.cards as Card[]).map((card) => [card.key, card.value]),
    );
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('sem token → 401', async () => {
    const { body } = await http().get('/dashboard').expect(401);
    expect(body).toMatchObject({ statusCode: 401, path: '/dashboard' });
  });

  it.each([
    ['USER', () => userToken],
    ['ADMIN', () => adminToken],
  ])('%s recebe os quatro cards', async (_, token) => {
    const { body } = await http()
      .get('/dashboard')
      .set(bearer(token()))
      .expect(200);
    expect(body).toEqual({
      cards: [
        { key: 'users', title: 'Usuários', value: expect.any(Number) },
        { key: 'products', title: 'Produtos', value: expect.any(Number) },
        { key: 'quotations', title: 'Cotações', value: expect.any(Number) },
        {
          key: 'pricingFormulas',
          title: 'Fórmulas de Precificação',
          value: expect.any(Number),
        },
      ],
      generatedAt: expect.any(String),
    });
  });

  it('o card de usuários soma o usuário cadastrado e os demais não mudam', async () => {
    const before = await values(userToken);

    await http()
      .post('/users')
      .set(bearer(adminToken))
      .send({
        name: `E2E Dashboard ${STAMP}`,
        email: `e2e-${STAMP}-dashboard@empresa.com.br`,
        password: 'Senha@123',
      })
      .expect(201);

    const after = await values(userToken);
    expect(after).toEqual({ ...before, users: before.users + 1 });
  });
});
