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

type Profile = 'USER' | 'ADMIN';

/**
 * Cobre: matriz de permissão de todas as rotas de `/products` — sem token (401), USER
 * (sucesso; 403 no `DELETE`) e ADMIN (sucesso em todas).
 * Não cobre: regras de negócio (`crud.e2e-spec.ts`).
 * Dado criado: produtos de código `E2E-<STAMP>-*`.
 */
describe('Produtos — acesso', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let targetId: number;
  const http = () => request(app.getHttpServer());
  const tokenOf = (profile: Profile) =>
    profile === 'ADMIN' ? adminToken : userToken;

  const createProduct = async (suffix: string) => {
    const { body } = await http()
      .post('/products')
      .set(bearer(adminToken))
      .send({
        name: `E2E Produto ${STAMP} ${suffix}`,
        code: `e2e-${STAMP}-${suffix}`,
        unit: 'kg',
      })
      .expect(201);
    return (body as { id: number }).id;
  };

  type Route = {
    method: 'get' | 'post' | 'patch' | 'delete';
    path: (id: number) => string;
    body?: (profile: Profile) => object;
    status: number;
  };

  const routes: [string, Route][] = [
    ['GET /products', { method: 'get', path: () => '/products', status: 200 }],
    [
      'GET /products/:id',
      { method: 'get', path: (id) => `/products/${id}`, status: 200 },
    ],
    [
      'POST /products',
      {
        method: 'post',
        path: () => '/products',
        body: (profile) => ({
          name: `E2E Produto ${STAMP} ${profile}`,
          code: `e2e-${STAMP}-${profile}`,
          unit: 'kg',
        }),
        status: 201,
      },
    ],
    [
      'PATCH /products/:id',
      {
        method: 'patch',
        path: (id) => `/products/${id}`,
        body: (profile) => ({ description: `Editado por ${profile}` }),
        status: 200,
      },
    ],
    [
      'PATCH /products/:id/status',
      {
        method: 'patch',
        path: (id) => `/products/${id}/status`,
        body: () => ({ active: true }),
        status: 200,
      },
    ],
  ];

  const deleteRoute: Route = {
    method: 'delete',
    path: (id) => `/products/${id}`,
    status: 204,
  };

  const call = (route: Route, id: number, profile: Profile = 'USER') => {
    const req = http()[route.method](route.path(id));
    return route.body ? req.send(route.body(profile)) : req;
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
    targetId = await createProduct('alvo');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([...routes, ['DELETE /products/:id', deleteRoute] as const])(
    '%s sem token → 401',
    async (_, route) => {
      const { body } = await call(route, targetId).expect(401);
      expect(body).toMatchObject({
        statusCode: 401,
        path: route.path(targetId),
      });
    },
  );

  describe.each(['USER', 'ADMIN'] as const)('como %s', (profile) => {
    it.each(routes)('%s → sucesso', async (_, route) => {
      await call(route, targetId, profile)
        .set(bearer(tokenOf(profile)))
        .expect(route.status);
    });
  });

  it('DELETE /products/:id como USER → 403 e o produto continua lá', async () => {
    const { body } = await call(deleteRoute, targetId)
      .set(bearer(userToken))
      .expect(403);
    expect(body).toMatchObject({
      statusCode: 403,
      path: `/products/${targetId}`,
    });
    await http()
      .get(`/products/${targetId}`)
      .set(bearer(userToken))
      .expect(200);
  });

  it('DELETE /products/:id como ADMIN → 204', async () => {
    const id = await createProduct('excluir');
    await call(deleteRoute, id).set(bearer(adminToken)).expect(204);
  });
});
