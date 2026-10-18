import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bearer, login } from '../support/auth';

export const ACCOUNT_PASSWORD = 'Senha@123';

export interface Account {
  id: number;
  email: string;
  token: string;
}

/**
 * Cria um usuário próprio do teste (como ADMIN) e já faz login com ele.
 * Fluxos que alteram a conta (perfil, senha, logout) nunca usam os usuários do seed.
 */
export async function createAccount(
  app: INestApplication<App>,
  adminToken: string,
  email: string,
  role: 'ADMIN' | 'USER' = 'USER',
): Promise<Account> {
  const { body } = await request(app.getHttpServer())
    .post('/users')
    .set(bearer(adminToken))
    .send({ name: 'E2E Conta', email, password: ACCOUNT_PASSWORD, role })
    .expect(201);
  const token = await login(app, email, ACCOUNT_PASSWORD);
  return { id: (body as { id: number }).id, email, token };
}

/** Garante que a resposta não vaza dados sensíveis do usuário. */
export function expectNoSecrets(user: unknown): void {
  expect(user).not.toHaveProperty('password');
  expect(user).not.toHaveProperty('tokenVersion');
}
