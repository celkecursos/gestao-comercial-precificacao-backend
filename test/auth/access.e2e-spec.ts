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
import { ACCOUNT_PASSWORD, createAccount } from './auth.helpers';

/**
 * Cobre: matriz de permissão das rotas autenticadas de `/auth` (`me`, `profile`,
 * `password`, `logout`) — sem token e com token inválido (401), USER e ADMIN (sucesso).
 * `GET /auth/me` usa os usuários do seed; as rotas que alteram a conta usam um usuário
 * próprio por caso (alterar o seed invalidaria os tokens da suíte).
 * As rotas públicas estão em `login.e2e-spec.ts` e `password-reset.e2e-spec.ts`.
 * Não cobre: regras de negócio da conta (`account.e2e-spec.ts`).
 * Dado criado: usuários `e2e-<STAMP>-access-*@empresa.com.br`.
 */
describe('Auth — acesso', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let sequence = 0;
  const http = () => request(app.getHttpServer());

  type Route = {
    method: 'get' | 'post' | 'patch';
    path: string;
    body?: object;
    status: number;
  };

  const routes: [string, Route][] = [
    ['GET /auth/me', { method: 'get', path: '/auth/me', status: 200 }],
    [
      'PATCH /auth/profile',
      {
        method: 'patch',
        path: '/auth/profile',
        body: { name: 'E2E Perfil' },
        status: 200,
      },
    ],
    [
      'PATCH /auth/password',
      {
        method: 'patch',
        path: '/auth/password',
        body: {
          currentPassword: ACCOUNT_PASSWORD,
          newPassword: 'NovaSenha@456',
        },
        status: 200,
      },
    ],
    [
      'POST /auth/logout',
      { method: 'post', path: '/auth/logout', status: 204 },
    ],
  ];

  const call = ({ method, path, body }: Route) => {
    const req = http()[method](path);
    return body ? req.send(body) : req;
  };

  const accountToken = async (role: 'ADMIN' | 'USER') => {
    sequence += 1;
    const email = `e2e-${STAMP}-access-${sequence}@empresa.com.br`;
    return (await createAccount(app, adminToken, email, role)).token;
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each(routes)('%s sem token → 401', async (_, route) => {
    const { body } = await call(route).expect(401);
    expect(body).toMatchObject({
      statusCode: 401,
      message: 'Token de acesso ausente ou inválido.',
      path: route.path,
    });
  });

  it.each(routes)('%s com token inválido → 401', async (_, route) => {
    const { body } = await call(route)
      .set(bearer('token.invalido.e2e'))
      .expect(401);
    expect(body).toMatchObject({ statusCode: 401, path: route.path });
  });

  it.each([
    ['USER', () => userToken, SEED_USER_EMAIL, 'USER'],
    ['ADMIN', () => adminToken, SEED_ADMIN_EMAIL, 'ADMIN'],
  ])(
    'GET /auth/me como %s retorna o próprio usuário',
    async (_, token, email, role) => {
      const { body } = await http()
        .get('/auth/me')
        .set(bearer(token()))
        .expect(200);
      expect(body).toMatchObject({ email, role, active: true });
      expect(body).not.toHaveProperty('password');
      expect(body).not.toHaveProperty('tokenVersion');
    },
  );

  describe.each(['USER', 'ADMIN'] as const)('como %s', (role) => {
    it.each(routes.filter(([name]) => name !== 'GET /auth/me'))(
      '%s → sucesso',
      async (_, route) => {
        const token = await accountToken(role);
        await call(route).set(bearer(token)).expect(route.status);
      },
    );
  });
});
