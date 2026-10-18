import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { createTestApp } from '../support/app';
import { bearer, login, SEED_ADMIN_EMAIL } from '../support/auth';
import { stamp } from '../support/data';
import { createUser, USER_PASSWORD } from './users.helpers';

/**
 * Cobre: o ADMIN não remove o próprio acesso via `/users` — não altera o próprio papel,
 * não se desativa e não se exclui (400); editar o próprio nome continua permitido.
 * Usa um ADMIN próprio (não o do seed) para não arriscar os tokens da suíte.
 * Não cobre: perfil próprio via `/auth/profile` (módulo auth).
 * Dado criado: ADMIN `e2e-<STAMP>-admin@empresa.com.br`.
 */
describe('Usuários — o ADMIN não remove o próprio acesso', () => {
  const STAMP = stamp();
  const email = `e2e-${STAMP}-admin@empresa.com.br`;
  let app: INestApplication<App>;
  let ownToken: string;
  let ownId: number;
  const http = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await createTestApp();
    const seedAdminToken = await login(app, SEED_ADMIN_EMAIL);
    ownId = (
      await createUser(app, seedAdminToken, {
        name: `E2E Admin ${STAMP}`,
        email,
        role: 'ADMIN',
      })
    ).id;
    ownToken = await login(app, email, USER_PASSWORD);
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    [
      'PATCH /users/:id alterando o papel',
      () => http().patch(`/users/${ownId}`).send({ role: 'USER' }),
      'Você não pode alterar o seu próprio papel.',
    ],
    [
      'PATCH /users/:id com active=false',
      () => http().patch(`/users/${ownId}`).send({ active: false }),
      'Você não pode desativar a si mesmo.',
    ],
    [
      'PATCH /users/:id/status com active=false',
      () => http().patch(`/users/${ownId}/status`).send({ active: false }),
      'Você não pode desativar a si mesmo.',
    ],
    [
      'DELETE /users/:id',
      () => http().delete(`/users/${ownId}`),
      'Você não pode excluir a si mesmo.',
    ],
  ])('%s em si mesmo → 400', async (_, call, message) => {
    const { body } = await call().set(bearer(ownToken)).expect(400);
    expect(body).toMatchObject({ statusCode: 400, message });

    const { body: self } = await http()
      .get(`/users/${ownId}`)
      .set(bearer(ownToken))
      .expect(200);
    expect(self).toMatchObject({ id: ownId, role: 'ADMIN', active: true });
  });

  it('edita o próprio nome (mantendo o mesmo papel)', async () => {
    const { body } = await http()
      .patch(`/users/${ownId}`)
      .set(bearer(ownToken))
      .send({ name: `E2E Admin Editado ${STAMP}`, role: 'ADMIN' })
      .expect(200);
    expect(body).toMatchObject({
      id: ownId,
      name: `E2E Admin Editado ${STAMP}`,
      role: 'ADMIN',
      active: true,
    });
  });
});
