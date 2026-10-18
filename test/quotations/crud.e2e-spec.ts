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

const DUPLICATED_MESSAGE =
  'Já existe uma cotação para esta data, fonte e commodity.';

/**
 * Cobre: ciclo completo da cotação (USER cadastra preservando a data e normalizando os
 * textos, consulta, edita; ADMIN exclui), duplicidade data/fonte/commodity no cadastro e
 * na edição (409), 404 e validação ligada (400).
 * Não cobre: validação campo a campo do DTO (unitário); filtros (`filters.e2e-spec.ts`).
 * Dado criado: cotações da commodity `E2E-<STAMP>-CRUD`.
 */
describe('Cotações — CRUD', () => {
  const STAMP = stamp();
  const COMMODITY = `E2E-${STAMP}-CRUD`;
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

  it('cadastra, consulta, edita e exclui uma cotação', async () => {
    // Cadastra — data preservada, fonte MANUAL por padrão, textos em maiúsculas.
    const { body: created } = await http()
      .post('/quotations')
      .set(bearer(userToken))
      .send({
        date: '2026-09-26',
        commodity: ` ${COMMODITY.toLowerCase()} `,
        value: 2850.1234,
        currency: 'usd',
        unit: 't',
      })
      .expect(201);
    expect(created).toMatchObject({
      id: expect.any(Number),
      date: '2026-09-26',
      source: 'MANUAL',
      commodity: COMMODITY,
      value: 2850.1234,
      currency: 'USD',
      unit: 'T',
    });
    const id = (created as { id: number }).id;

    // Mesma data, fonte e commodity → 409.
    const { body: duplicated } = await http()
      .post('/quotations')
      .set(bearer(userToken))
      .send({
        date: '2026-09-26',
        commodity: COMMODITY,
        value: 1,
        currency: 'USD',
        unit: 'T',
      })
      .expect(409);
    expect(duplicated).toMatchObject({
      statusCode: 409,
      message: DUPLICATED_MESSAGE,
      path: '/quotations',
    });

    // Mesma data e commodity em outra fonte é permitido.
    const { body: lme } = await http()
      .post('/quotations')
      .set(bearer(userToken))
      .send({
        date: '2026-09-26',
        source: 'LME',
        commodity: COMMODITY,
        value: 2851,
        currency: 'USD',
        unit: 'T',
      })
      .expect(201);
    expect(lme).toMatchObject({ source: 'LME', commodity: COMMODITY });

    // Editar a outra para colidir com a primeira → 409.
    const { body: conflict } = await http()
      .patch(`/quotations/${lme.id}`)
      .set(bearer(userToken))
      .send({ source: 'MANUAL' })
      .expect(409);
    expect(conflict).toMatchObject({
      statusCode: 409,
      message: DUPLICATED_MESSAGE,
      path: `/quotations/${lme.id}`,
    });

    // Edita valor e data.
    const { body: updated } = await http()
      .patch(`/quotations/${id}`)
      .set(bearer(userToken))
      .send({ value: 2900.5, date: '2026-09-27' })
      .expect(200);
    expect(updated).toMatchObject({
      id,
      date: '2026-09-27',
      value: 2900.5,
      source: 'MANUAL',
      commodity: COMMODITY,
    });

    // Consulta.
    const { body: found } = await http()
      .get(`/quotations/${id}`)
      .set(bearer(userToken))
      .expect(200);
    expect(found).toMatchObject({ id, date: '2026-09-27', value: 2900.5 });

    // Exclui (física, só ADMIN) — some da consulta e da listagem.
    await http()
      .delete(`/quotations/${id}`)
      .set(bearer(adminToken))
      .expect(204);

    const { body: gone } = await http()
      .get(`/quotations/${id}`)
      .set(bearer(userToken))
      .expect(404);
    expect(gone).toMatchObject({
      statusCode: 404,
      message: 'Cotação não encontrada.',
      path: `/quotations/${id}`,
    });

    const { body: list } = await http()
      .get('/quotations')
      .query({ commodity: COMMODITY })
      .set(bearer(userToken))
      .expect(200);
    expect(list.data.map((q: { id: number }) => q.id)).toEqual([lme.id]);
  });

  it('rotas com :id de cotação inexistente → 404', async () => {
    const missing = 999999999;
    const requests = [
      () => http().get(`/quotations/${missing}`),
      () => http().patch(`/quotations/${missing}`).send({ value: 1 }),
      () => http().delete(`/quotations/${missing}`),
    ];
    for (const req of requests) {
      const { body } = await req().set(bearer(adminToken)).expect(404);
      expect(body.message).toBe('Cotação não encontrada.');
    }
  });

  it('valida os dados no cadastro (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .post('/quotations')
      .set(bearer(userToken))
      .send({ date: '26/09/2026', commodity: COMMODITY, value: -1 })
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: '/quotations' });
    expect(Array.isArray(body.message)).toBe(true);
  });
});
