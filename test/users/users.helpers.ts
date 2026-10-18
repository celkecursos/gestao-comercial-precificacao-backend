import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { bearer } from '../support/auth';

export const USER_PASSWORD = 'Senha@123';

export interface UserBody {
  id: number;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  active: boolean;
}

/** Cria um usuário via `POST /users` (como ADMIN), confere o 201 e devolve o corpo. */
export async function createUser(
  app: INestApplication<App>,
  adminToken: string,
  data: { name: string; email: string; role?: string; active?: boolean },
): Promise<UserBody> {
  const { body } = await request(app.getHttpServer())
    .post('/users')
    .set(bearer(adminToken))
    .send({ password: USER_PASSWORD, ...data })
    .expect(201);
  return body as UserBody;
}

/** Garante que a resposta não vaza dados sensíveis do usuário. */
export function expectNoSecrets(user: unknown): void {
  expect(user).not.toHaveProperty('password');
  expect(user).not.toHaveProperty('tokenVersion');
}
