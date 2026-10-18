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

/**
 * Cobre: `GET /health` (rota pública) — mesma resposta sem token, com token inválido,
 * como USER e como ADMIN, com o banco no ar.
 * Não cobre: banco indisponível (503), que exigiria derrubar o MySQL compartilhado.
 * Dado criado: nenhum.
 */
describe('Health — verificação', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['sem token', () => ({})],
    ['com token inválido', () => bearer('token.invalido.e2e')],
    ['como USER', () => bearer(userToken)],
    ['como ADMIN', () => bearer(adminToken)],
  ])('GET /health %s → 200 com API e banco no ar', async (_, headers) => {
    const { body } = await http().get('/health').set(headers()).expect(200);
    expect(body).toEqual({
      status: 'ok',
      database: 'up',
      timestamp: expect.any(String),
    });
    expect(new Date(body.timestamp).toISOString()).toBe(body.timestamp);
  });
});
