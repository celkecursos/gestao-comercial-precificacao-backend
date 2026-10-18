import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SEED_PRODUCTS } from '../../src/database/seeds/seed-data';
import { createTestApp } from '../support/app';
import {
  bearer,
  login,
  SEED_ADMIN_EMAIL,
  SEED_USER_EMAIL,
} from '../support/auth';
import { stamp } from '../support/data';

/**
 * Cobre: ciclo completo do produto (USER cria, busca por nome e código, edita, desativa,
 * filtra por status; ADMIN exclui), código duplicado (409), 404 e validação ligada (400).
 * Não cobre: normalização e validação campo a campo do DTO (unitário).
 * Dado criado: produtos de código `E2E-<STAMP>-*`.
 */
describe('Produtos — CRUD', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  const search = async (query: Record<string, string>) => {
    const { body } = await http()
      .get('/products')
      .query(query)
      .set(bearer(userToken))
      .expect(200);
    return body as { data: { id: number }[]; meta: { total: number } };
  };

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('cria, busca, edita, desativa e exclui um produto', async () => {
    const code = `E2E-${STAMP}-CRUD`;

    // Cria — código e unidade em maiúsculas, ativo por padrão.
    const { body: created } = await http()
      .post('/products')
      .set(bearer(userToken))
      .send({
        name: `  E2E Produto ${STAMP}  `,
        code: ` e2e-${STAMP}-crud `,
        unit: 'kg',
      })
      .expect(201);
    expect(created).toMatchObject({
      id: expect.any(Number),
      name: `E2E Produto ${STAMP}`,
      code,
      unit: 'KG',
      description: null,
      active: true,
    });
    const id = (created as { id: number }).id;

    // Busca pelo nome e pelo código.
    for (const term of [`E2E Produto ${STAMP}`, `e2e-${STAMP}-crud`]) {
      const result = await search({ search: term });
      expect(result.meta.total).toBe(1);
      expect(result.data).toEqual([expect.objectContaining({ id, code })]);
    }

    // Código duplicado (sem diferenciar maiúsculas) → 409.
    const { body: duplicated } = await http()
      .post('/products')
      .set(bearer(userToken))
      .send({ name: 'Duplicado', code: code.toLowerCase(), unit: 'KG' })
      .expect(409);
    expect(duplicated).toMatchObject({
      statusCode: 409,
      message: 'Já existe um produto com este código.',
      path: '/products',
    });

    // Editar para o código de um produto do seed → 409.
    const { body: conflict } = await http()
      .patch(`/products/${id}`)
      .set(bearer(userToken))
      .send({ code: SEED_PRODUCTS[0].code })
      .expect(409);
    expect(conflict.message).toBe('Já existe um produto com este código.');

    // Edita.
    const { body: updated } = await http()
      .patch(`/products/${id}`)
      .set(bearer(userToken))
      .send({ name: `E2E Editado ${STAMP}`, description: 'Descrição E2E' })
      .expect(200);
    expect(updated).toMatchObject({
      id,
      code,
      name: `E2E Editado ${STAMP}`,
      description: 'Descrição E2E',
    });

    // Desativa — sai do filtro de ativos e entra no de inativos.
    const { body: disabled } = await http()
      .patch(`/products/${id}/status`)
      .set(bearer(userToken))
      .send({ active: false })
      .expect(200);
    expect(disabled).toMatchObject({ id, active: false });

    const inactive = await search({ search: code, active: 'false' });
    expect(inactive.data).toEqual([expect.objectContaining({ id })]);
    const active = await search({ search: code, active: 'true' });
    expect(active.meta.total).toBe(0);

    // Exclui (física, só ADMIN) — some da consulta e da busca.
    await http().delete(`/products/${id}`).set(bearer(adminToken)).expect(204);

    const { body: gone } = await http()
      .get(`/products/${id}`)
      .set(bearer(userToken))
      .expect(404);
    expect(gone).toMatchObject({
      statusCode: 404,
      message: 'Produto não encontrado.',
      path: `/products/${id}`,
    });
    expect((await search({ search: code })).meta.total).toBe(0);
  });

  it('rotas com :id de produto inexistente → 404', async () => {
    const missing = 999999999;
    const requests = [
      () => http().get(`/products/${missing}`),
      () => http().patch(`/products/${missing}`).send({ name: 'Ninguém' }),
      () => http().patch(`/products/${missing}/status`).send({ active: false }),
      () => http().delete(`/products/${missing}`),
    ];
    for (const req of requests) {
      const { body } = await req().set(bearer(adminToken)).expect(404);
      expect(body.message).toBe('Produto não encontrado.');
    }
  });

  it('valida os dados na criação (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .post('/products')
      .set(bearer(userToken))
      .send({ name: 'X', code: 'código inválido' })
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: '/products' });
    expect(Array.isArray(body.message)).toBe(true);
  });
});
