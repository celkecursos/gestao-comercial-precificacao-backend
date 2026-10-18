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
 * Cobre: matriz de permissão de todas as rotas de `/quotations` — sem token (401), USER
 * (sucesso; 403 no `DELETE`) e ADMIN (sucesso em todas).
 * Não cobre: regras de negócio (`crud.e2e-spec.ts`, `filters.e2e-spec.ts`).
 * Dado criado: cotações da commodity `E2E-<STAMP>-ACESSO`.
 */
describe('Cotações — acesso', () => {
  const STAMP = stamp();
  const COMMODITY = `E2E-${STAMP}-ACESSO`;
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  let targetId: number;
  const http = () => request(app.getHttpServer());
  const tokenOf = (profile: Profile) =>
    profile === 'ADMIN' ? adminToken : userToken;

  const quotation = (date: string) => ({
    date,
    commodity: COMMODITY,
    value: 100,
    currency: 'USD',
    unit: 'T',
  });

  const createQuotation = async (date: string) => {
    const { body } = await http()
      .post('/quotations')
      .set(bearer(adminToken))
      .send(quotation(date))
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
      'GET /quotations',
      { method: 'get', path: () => '/quotations', status: 200 },
    ],
    [
      'GET /quotations/:id',
      { method: 'get', path: (id) => `/quotations/${id}`, status: 200 },
    ],
    [
      'POST /quotations',
      {
        method: 'post',
        path: () => '/quotations',
        body: (profile) =>
          quotation(profile === 'ADMIN' ? '2026-01-02' : '2026-01-03'),
        status: 201,
      },
    ],
    [
      'PATCH /quotations/:id',
      {
        method: 'patch',
        path: (id) => `/quotations/${id}`,
        body: (profile) => ({ value: profile === 'ADMIN' ? 200 : 300 }),
        status: 200,
      },
    ],
  ];

  const deleteRoute: Route = {
    method: 'delete',
    path: (id) => `/quotations/${id}`,
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
    targetId = await createQuotation('2026-01-01');
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([...routes, ['DELETE /quotations/:id', deleteRoute] as const])(
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

  it('DELETE /quotations/:id como USER → 403 e a cotação continua lá', async () => {
    const { body } = await call(deleteRoute, targetId)
      .set(bearer(userToken))
      .expect(403);
    expect(body).toMatchObject({
      statusCode: 403,
      path: `/quotations/${targetId}`,
    });
    await http()
      .get(`/quotations/${targetId}`)
      .set(bearer(userToken))
      .expect(200);
  });

  it('DELETE /quotations/:id como ADMIN → 204', async () => {
    const id = await createQuotation('2026-01-04');
    await call(deleteRoute, id).set(bearer(adminToken)).expect(204);
  });
});
