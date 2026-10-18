import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { Role } from '../../src/common/enums/role.enum';
import { DEMO_PASSWORD, SEED_USERS } from '../../src/database/seeds/seed-data';

const seedEmail = (role: Role) => {
  const user = SEED_USERS.find((seedUser) => seedUser.role === role);
  if (!user) throw new Error(`O seed não tem usuário com o papel ${role}.`);
  return user.email;
};

/** Usuários do seed — só leitura (ver `.claude/rules/e2e.md`). */
export const SEED_ADMIN_EMAIL = seedEmail(Role.Admin);
export const SEED_USER_EMAIL = seedEmail(Role.User);

/** Faz login, confere o 200 e devolve o `accessToken`. */
export async function login(
  app: INestApplication<App>,
  email: string,
  password = DEMO_PASSWORD,
): Promise<string> {
  const response = await request(app.getHttpServer())
    .post('/auth/login')
    .send({ email, password })
    .expect(200);
  return (response.body as { accessToken: string }).accessToken;
}

export const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });
