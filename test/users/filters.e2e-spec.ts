import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../support/app';
import { bearer, login, SEED_ADMIN_EMAIL } from '../support/auth';
import { stamp } from '../support/data';
import { createUser, expectNoSecrets } from './users.helpers';

type UserList = {
  data: { email: string }[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

/**
 * Cobre: filtros da listagem de `/users` — `search` (nome ou e-mail), `role`, `active`,
 * ordenação por nome e paginação.
 * Não cobre: transformação dos parâmetros de query (unitário).
 * Dado criado: três usuários `e2e-<STAMP>-*@empresa.com.br`, nomes `E2E <STAMP> *`.
 */
describe('Usuários — filtros', () => {
  const STAMP = stamp();
  const ANA = `e2e-${STAMP}-ana@empresa.com.br`;
  const BRUNO = `e2e-${STAMP}-bruno@empresa.com.br`;
  const CARLA = `e2e-${STAMP}-carla@empresa.com.br`;
  let app: INestApplication<App>;
  let adminToken: string;
  const http = () => request(app.getHttpServer());

  const list = async (query: Record<string, string | number>) => {
    const { body } = await http()
      .get('/users')
      .query({ search: `e2e-${STAMP}`, ...query })
      .set(bearer(adminToken))
      .expect(200);
    for (const user of (body as UserList).data) expectNoSecrets(user);
    return body as UserList;
  };
  const emails = async (query: Record<string, string | number> = {}) =>
    (await list(query)).data.map((user) => user.email);

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    // Criados fora da ordem alfabética para provar a ordenação por nome.
    await createUser(app, adminToken, {
      name: `E2E ${STAMP} Carla`,
      email: CARLA,
      active: false,
    });
    await createUser(app, adminToken, {
      name: `E2E ${STAMP} Ana`,
      email: ANA,
      role: 'ADMIN',
    });
    await createUser(app, adminToken, {
      name: `E2E ${STAMP} Bruno`,
      email: BRUNO,
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('search encontra por e-mail e ordena por nome', async () => {
    const body = await list({});
    expect(body.data.map((user) => user.email)).toEqual([ANA, BRUNO, CARLA]);
    expect(body.meta.total).toBe(3);
  });

  it('search encontra por nome', async () => {
    expect(await emails({ search: `${STAMP} Bruno` })).toEqual([BRUNO]);
  });

  it('role filtra pelo papel', async () => {
    expect(await emails({ role: 'ADMIN' })).toEqual([ANA]);
    expect(await emails({ role: 'USER' })).toEqual([BRUNO, CARLA]);
  });

  it('active filtra pelo status', async () => {
    expect(await emails({ active: 'false' })).toEqual([CARLA]);
    expect(await emails({ active: 'true' })).toEqual([ANA, BRUNO]);
  });

  it('pagina o resultado', async () => {
    const page2 = await list({ page: 2, limit: 2 });
    expect(page2.data.map((user) => user.email)).toEqual([CARLA]);
    expect(page2.meta).toEqual({ page: 2, limit: 2, total: 3, totalPages: 2 });
  });

  it('rejeita filtro inválido (400)', async () => {
    const { body } = await http()
      .get('/users')
      .query({ role: 'SUPER', limit: 1000 })
      .set(bearer(adminToken))
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: expect.any(String) });
    expect(Array.isArray(body.message)).toBe(true);
  });
});
