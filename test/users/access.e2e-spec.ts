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
import { createUser, USER_PASSWORD } from './users.helpers';

/**
 * Cobre: matriz de permissão de todas as rotas de `/users` — sem token (401) e USER (403).
 * O caso ADMIN (sucesso) de cada rota está em `crud.e2e-spec.ts`.
 * Não cobre: regras de negócio (crud/self-protection).
 * Dado criado: usuário `e2e-<STAMP>-alvo@empresa.com.br` (alvo das rotas com `:id`).
 */
describe('Usuários — acesso', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let targetId: number;
  const http = () => request(app.getHttpServer());

  type Route = {
    method: 'get' | 'post' | 'patch' | 'delete';
    path: () => string;
    body?: object;
  };

  const routes: [string, Route][] = [
    ['GET /users', { method: 'get', path: () => '/users' }],
    ['GET /users/:id', { method: 'get', path: () => `/users/${targetId}` }],
    [
      'POST /users',
      {
        method: 'post',
        path: () => '/users',
        body: {
          name: 'Não Deve Criar',
          email: `e2e-${STAMP}-negado@empresa.com.br`,
          password: USER_PASSWORD,
        },
      },
    ],
    [
      'PATCH /users/:id',
      {
        method: 'patch',
        path: () => `/users/${targetId}`,
        body: { name: 'Não Deve Editar' },
      },
    ],
    [
      'PATCH /users/:id/status',
      {
        method: 'patch',
        path: () => `/users/${targetId}/status`,
        body: { active: false },
      },
    ],
    [
      'DELETE /users/:id',
      { method: 'delete', path: () => `/users/${targetId}` },
    ],
  ];

  const call = ({ method, path, body }: Route) => {
    const req = http()[method](path());
    return body ? req.send(body) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
    targetId = (
      await createUser(app, adminToken, {
        name: `E2E Alvo ${STAMP}`,
        email: `e2e-${STAMP}-alvo@empresa.com.br`,
      })
    ).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(routes)('%s sem token → 401', async (_, route) => {
    const { body } = await call(route).expect(401);
    expect(body).toMatchObject({ statusCode: 401, path: route.path() });
  });

  it.each(routes)('%s como USER → 403', async (_, route) => {
    const { body } = await call(route).set(bearer(userToken)).expect(403);
    expect(body).toMatchObject({ statusCode: 403, path: route.path() });
  });

  it('as tentativas negadas não alteraram nada', async () => {
    const { body } = await http()
      .get(`/users/${targetId}`)
      .set(bearer(adminToken))
      .expect(200);
    expect(body).toMatchObject({ name: `E2E Alvo ${STAMP}`, active: true });

    const { body: list } = await http()
      .get('/users')
      .query({ search: `e2e-${STAMP}` })
      .set(bearer(adminToken))
      .expect(200);
    const emails = list.data.map((user: { email: string }) => user.email);
    expect(emails).toContain(`e2e-${STAMP}-alvo@empresa.com.br`);
    expect(emails).not.toContain(`e2e-${STAMP}-negado@empresa.com.br`);
  });
});
