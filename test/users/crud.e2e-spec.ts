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
import {
  createUser,
  expectNoSecrets,
  USER_PASSWORD,
  UserBody,
} from './users.helpers';

/**
 * Cobre: ciclo completo do usuário pelo ADMIN (cria, lista, consulta, edita, desativa,
 * reativa, exclui), e-mail duplicado (409), 404, validação ligada (400) e a redefinição
 * de senha pelo ADMIN invalidando os tokens do usuário.
 * Não cobre: validação campo a campo do DTO e normalizações isoladas (unitário).
 * Dado criado: usuários `e2e-<STAMP>-*@empresa.com.br`.
 */
describe('Usuários — CRUD', () => {
  const STAMP = stamp();
  let app: INestApplication<App>;
  let adminToken: string;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    adminToken = await login(app, SEED_ADMIN_EMAIL);
  });

  afterAll(async () => {
    await app.close();
  });

  it('ADMIN cria, lista, consulta, edita, desativa e exclui um usuário', async () => {
    const email = `e2e-${STAMP}-crud@empresa.com.br`;

    // Cria — nome e e-mail normalizados; papel padrão USER.
    const { body: created } = await http()
      .post('/users')
      .set(bearer(adminToken))
      .send({
        name: `  E2E Usuário ${STAMP}  `,
        email: `  E2E-${STAMP}-CRUD@Empresa.com.br `,
        password: USER_PASSWORD,
      })
      .expect(201);
    expect(created).toMatchObject({
      id: expect.any(Number),
      name: `E2E Usuário ${STAMP}`,
      email,
      role: 'USER',
      active: true,
    });
    expectNoSecrets(created);
    const id = (created as UserBody).id;

    // Lista filtrando pelo STAMP — nenhum item expõe senha.
    const { body: list } = await http()
      .get('/users')
      .query({ search: `e2e-${STAMP}-crud` })
      .set(bearer(adminToken))
      .expect(200);
    expect(list.meta).toMatchObject({ page: 1, total: 1 });
    expect(list.data).toEqual([expect.objectContaining({ id, email })]);
    for (const user of list.data) expectNoSecrets(user);

    // Consulta.
    const { body: found } = await http()
      .get(`/users/${id}`)
      .set(bearer(adminToken))
      .expect(200);
    expect(found).toMatchObject({ id, email, role: 'USER' });
    expectNoSecrets(found);

    // E-mail duplicado (sem diferenciar maiúsculas) → 409.
    const { body: duplicated } = await http()
      .post('/users')
      .set(bearer(adminToken))
      .send({
        name: 'Duplicado',
        email: email.toUpperCase(),
        password: USER_PASSWORD,
      })
      .expect(409);
    expect(duplicated).toMatchObject({
      statusCode: 409,
      message: 'Já existe um usuário com este e-mail.',
      path: '/users',
    });

    // Editar para o e-mail de outro usuário → 409.
    const { body: conflict } = await http()
      .patch(`/users/${id}`)
      .set(bearer(adminToken))
      .send({ email: SEED_USER_EMAIL })
      .expect(409);
    expect(conflict.message).toBe('Já existe um usuário com este e-mail.');

    // Edita nome e papel.
    const { body: updated } = await http()
      .patch(`/users/${id}`)
      .set(bearer(adminToken))
      .send({ name: `E2E Editado ${STAMP}`, role: 'ADMIN' })
      .expect(200);
    expect(updated).toMatchObject({
      id,
      name: `E2E Editado ${STAMP}`,
      role: 'ADMIN',
      email,
    });
    expectNoSecrets(updated);

    // Desativa — o usuário não consegue mais entrar.
    const { body: disabled } = await http()
      .patch(`/users/${id}/status`)
      .set(bearer(adminToken))
      .send({ active: false })
      .expect(200);
    expect(disabled).toMatchObject({ id, active: false });
    expectNoSecrets(disabled);

    const { body: denied } = await http()
      .post('/auth/login')
      .send({ email, password: USER_PASSWORD })
      .expect(401);
    expect(denied).toMatchObject({
      statusCode: 401,
      message: 'Usuário inativo.',
    });

    // Reativa — volta a entrar.
    const { body: enabled } = await http()
      .patch(`/users/${id}/status`)
      .set(bearer(adminToken))
      .send({ active: true })
      .expect(200);
    expect(enabled.active).toBe(true);
    await login(app, email, USER_PASSWORD);

    // Exclui (física) — some da consulta e da listagem.
    await http().delete(`/users/${id}`).set(bearer(adminToken)).expect(204);

    const { body: gone } = await http()
      .get(`/users/${id}`)
      .set(bearer(adminToken))
      .expect(404);
    expect(gone).toMatchObject({
      statusCode: 404,
      message: 'Usuário não encontrado.',
      path: `/users/${id}`,
    });

    const { body: afterDelete } = await http()
      .get('/users')
      .query({ search: `e2e-${STAMP}-crud` })
      .set(bearer(adminToken))
      .expect(200);
    expect(afterDelete.meta.total).toBe(0);
  });

  it('rotas com :id de usuário inexistente → 404', async () => {
    const missing = 999999999;
    const requests = [
      () => http().get(`/users/${missing}`),
      () => http().patch(`/users/${missing}`).send({ name: 'Ninguém' }),
      () => http().patch(`/users/${missing}/status`).send({ active: false }),
      () => http().delete(`/users/${missing}`),
    ];
    for (const req of requests) {
      const { body } = await req().set(bearer(adminToken)).expect(404);
      expect(body.message).toBe('Usuário não encontrado.');
    }
  });

  it('valida os dados na criação (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .post('/users')
      .set(bearer(adminToken))
      .send({ name: 'X', email: 'invalido', password: '123' })
      .expect(400);
    expect(body).toMatchObject({ statusCode: 400, path: '/users' });
    expect(Array.isArray(body.message)).toBe(true);
  });

  it('ADMIN redefine a senha e os tokens antigos do usuário deixam de valer', async () => {
    const email = `e2e-${STAMP}-senha@empresa.com.br`;
    const user = await createUser(app, adminToken, {
      name: `E2E Senha ${STAMP}`,
      email,
    });
    const oldToken = await login(app, email, USER_PASSWORD);
    await http().get('/auth/me').set(bearer(oldToken)).expect(200);

    const { body } = await http()
      .patch(`/users/${user.id}`)
      .set(bearer(adminToken))
      .send({ password: 'NovaSenha@456' })
      .expect(200);
    expectNoSecrets(body);

    await http().get('/auth/me').set(bearer(oldToken)).expect(401);
    await http()
      .post('/auth/login')
      .send({ email, password: USER_PASSWORD })
      .expect(401);
    await login(app, email, 'NovaSenha@456');
  });
});
