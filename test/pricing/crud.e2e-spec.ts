import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SEED_PRICING_FORMULAS } from '../../src/database/seeds/seed-data';
import { createTestApp } from '../support/app';
import {
  bearer,
  login,
  SEED_ADMIN_EMAIL,
  SEED_USER_EMAIL,
} from '../support/auth';
import { stamp } from '../support/data';

const DUPLICATED_MESSAGE = 'Já existe uma fórmula com este nome.';
const NOT_FOUND_MESSAGE = 'Fórmula de precificação não encontrada.';

/**
 * Cobre: ciclo completo da fórmula (USER cria, busca pelo nome, edita, desativa, filtra
 * por status; ADMIN exclui), nome duplicado no cadastro e na edição (409), 404 e
 * validação ligada (400).
 * Não cobre: o cálculo de preço e a validação campo a campo do DTO (unitário).
 * Dado criado: fórmulas `E2E Fórmula <STAMP> *`.
 */
describe('Fórmulas de precificação — CRUD', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  const search = async (query: Record<string, string>) => {
    const { body } = await http()
      .get('/pricing-formulas')
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

  it('cria, busca, edita, desativa e exclui uma fórmula', async () => {
    const name = `E2E Fórmula ${STAMP} CRUD`;

    // Cria — nome sem espaços nas pontas, ativa por padrão.
    const { body: created } = await http()
      .post('/pricing-formulas')
      .set(bearer(userToken))
      .send({ name: `  ${name}  `, description: 'Teste' })
      .expect(201);
    expect(created).toMatchObject({
      id: expect.any(Number),
      name,
      description: 'Teste',
      active: true,
    });
    const id = (created as { id: number }).id;

    // Busca pelo nome.
    const found = await search({ search: name });
    expect(found.meta.total).toBe(1);
    expect(found.data).toEqual([expect.objectContaining({ id, name })]);

    // Nome duplicado → 409.
    const { body: duplicated } = await http()
      .post('/pricing-formulas')
      .set(bearer(userToken))
      .send({ name })
      .expect(409);
    expect(duplicated).toMatchObject({
      statusCode: 409,
      message: DUPLICATED_MESSAGE,
      path: '/pricing-formulas',
    });

    // Editar para o nome de uma fórmula do seed → 409.
    const { body: conflict } = await http()
      .patch(`/pricing-formulas/${id}`)
      .set(bearer(userToken))
      .send({ name: SEED_PRICING_FORMULAS[0].name })
      .expect(409);
    expect(conflict.message).toBe(DUPLICATED_MESSAGE);

    // Edita e consulta.
    const editedName = `E2E Fórmula ${STAMP} Editada`;
    const { body: updated } = await http()
      .patch(`/pricing-formulas/${id}`)
      .set(bearer(userToken))
      .send({ name: editedName, description: 'Descrição E2E' })
      .expect(200);
    expect(updated).toMatchObject({
      id,
      name: editedName,
      description: 'Descrição E2E',
    });

    const { body: fetched } = await http()
      .get(`/pricing-formulas/${id}`)
      .set(bearer(userToken))
      .expect(200);
    expect(fetched).toMatchObject({ id, name: editedName, active: true });

    // Desativa — sai do filtro de ativas e entra no de inativas.
    const { body: disabled } = await http()
      .patch(`/pricing-formulas/${id}/status`)
      .set(bearer(userToken))
      .send({ active: false })
      .expect(200);
    expect(disabled).toMatchObject({ id, active: false });

    const inactive = await search({ search: editedName, active: 'false' });
    expect(inactive.data).toEqual([expect.objectContaining({ id })]);
    const active = await search({ search: editedName, active: 'true' });
    expect(active.meta.total).toBe(0);

    // Exclui (física, só ADMIN) — some da consulta e da busca.
    await http()
      .delete(`/pricing-formulas/${id}`)
      .set(bearer(adminToken))
      .expect(204);

    const { body: gone } = await http()
      .get(`/pricing-formulas/${id}`)
      .set(bearer(userToken))
      .expect(404);
    expect(gone).toMatchObject({
      statusCode: 404,
      message: NOT_FOUND_MESSAGE,
      path: `/pricing-formulas/${id}`,
    });
    expect((await search({ search: editedName })).meta.total).toBe(0);
  });

  it('rotas com :id de fórmula inexistente → 404', async () => {
    const missing = 999999999;
    const requests = [
      () => http().get(`/pricing-formulas/${missing}`),
      () =>
        http().patch(`/pricing-formulas/${missing}`).send({ name: 'Ninguém' }),
      () =>
        http()
          .patch(`/pricing-formulas/${missing}/status`)
          .send({ active: false }),
      () => http().delete(`/pricing-formulas/${missing}`),
    ];
    for (const req of requests) {
      const { body } = await req().set(bearer(adminToken)).expect(404);
      expect(body.message).toBe(NOT_FOUND_MESSAGE);
    }
  });

  it('valida os dados na criação (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .post('/pricing-formulas')
      .set(bearer(userToken))
      .send({ name: 'X', active: 'sim' })
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: '/pricing-formulas' });
    expect(Array.isArray(body.message)).toBe(true);
  });
});
