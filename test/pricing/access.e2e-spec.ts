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
 * Cobre: matriz de permissão de todas as rotas de `/pricing-formulas` — sem token (401),
 * USER (sucesso; 403 no `DELETE`) e ADMIN (sucesso em todas).
 * Não cobre: regras de negócio (`crud.e2e-spec.ts`).
 * Dado criado: fórmulas `E2E Fórmula <STAMP> *`.
 */
describe('Fórmulas de precificação — acesso', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let targetId: number;
  const http = () => request(app.getHttpServer());
  const tokenOf = (profile: Profile) =>
    profile === 'ADMIN' ? adminToken : userToken;

  const createFormula = async (suffix: string) => {
    const { body } = await http()
      .post('/pricing-formulas')
      .set(bearer(adminToken))
      .send({ name: `E2E Fórmula ${STAMP} ${suffix}` })
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
    [
      'GET /pricing-formulas',
      { method: 'get', path: () => '/pricing-formulas', status: 200 },
    ],
    [
      'GET /pricing-formulas/:id',
      { method: 'get', path: (id) => `/pricing-formulas/${id}`, status: 200 },
    ],
    [
      'POST /pricing-formulas',
      {
        method: 'post',
        path: () => '/pricing-formulas',
        body: (profile) => ({ name: `E2E Fórmula ${STAMP} ${profile}` }),
        status: 201,
      },
    ],
    [
      'PATCH /pricing-formulas/:id',
      {
        method: 'patch',
        path: (id) => `/pricing-formulas/${id}`,
        body: (profile) => ({ description: `Editada por ${profile}` }),
        status: 200,
      },
    ],
    [
      'PATCH /pricing-formulas/:id/status',
      {
        method: 'patch',
        path: (id) => `/pricing-formulas/${id}/status`,
        body: () => ({ active: true }),
        status: 200,
      },
    ],
  ];

  const deleteRoute: Route = {
    method: 'delete',
    path: (id) => `/pricing-formulas/${id}`,
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
    targetId = await createFormula('alvo');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([...routes, ['DELETE /pricing-formulas/:id', deleteRoute] as const])(
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

  it('DELETE /pricing-formulas/:id como USER → 403 e a fórmula continua lá', async () => {
    const { body } = await call(deleteRoute, targetId)
      .set(bearer(userToken))
      .expect(403);
    expect(body).toMatchObject({
      statusCode: 403,
      path: `/pricing-formulas/${targetId}`,
    });
    await http()
      .get(`/pricing-formulas/${targetId}`)
      .set(bearer(userToken))
      .expect(200);
  });

  it('DELETE /pricing-formulas/:id como ADMIN → 204', async () => {
    const id = await createFormula('excluir');
    await call(deleteRoute, id).set(bearer(adminToken)).expect(204);
  });
});
