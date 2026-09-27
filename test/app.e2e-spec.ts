import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { DEMO_PASSWORD } from '../src/database/seeds/seed-data';

/**
 * Testes ponta a ponta contra um MySQL real (banco de testes recriado no globalSetup,
 * já com os dados de seed). Os blocos compartilham estado e rodam em sequência.
 */
describe('API (e2e)', () => {
  let app: INestApplication<App>;
  let adminToken: string;
  let userToken: string;

  const http = () => request(app.getHttpServer());
  const login = async (email: string, password = DEMO_PASSWORD) => {
    const response = await http()
      .post('/auth/login')
      .send({ email, password })
      .expect(200);
    return (response.body as { accessToken: string }).accessToken;
  };
  const bearer = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health', async () => {
    const { body } = await http().get('/health').expect(200);
    expect(body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('GET /api/docs-json expõe o contrato OpenAPI', async () => {
    const { body } = await http().get('/api/docs-json').expect(200);
    expect(Object.keys((body as { paths: object }).paths)).toEqual(
      expect.arrayContaining(['/auth/login', '/products', '/dashboard']),
    );
  });

  describe('Autenticação', () => {
    it('faz login com as credenciais de demonstração', async () => {
      const { body } = await http()
        .post('/auth/login')
        .send({ email: 'cesar@celke.com.br', password: DEMO_PASSWORD })
        .expect(200);

      expect(body).toMatchObject({
        tokenType: 'Bearer',
        user: { email: 'cesar@celke.com.br', role: 'ADMIN' },
      });
      expect(body.user).not.toHaveProperty('password');
      expect(body.user).not.toHaveProperty('tokenVersion');

      adminToken = (body as { accessToken: string }).accessToken;
      userToken = await login('kelly@celke.com.br');
    });

    it('rejeita senha inválida', async () => {
      const { body } = await http()
        .post('/auth/login')
        .send({ email: 'cesar@celke.com.br', password: 'errada' })
        .expect(401);
      expect(body).toMatchObject({
        statusCode: 401,
        message: 'E-mail ou senha inválidos.',
        path: '/auth/login',
      });
    });

    it('bloqueia rotas privadas sem token', async () => {
      await http().get('/auth/me').expect(401);
      await http().get('/products').expect(401);
    });

    it('GET /auth/me retorna o usuário autenticado', async () => {
      const { body } = await http()
        .get('/auth/me')
        .set(bearer(userToken))
        .expect(200);
      expect(body).toMatchObject({
        email: 'kelly@celke.com.br',
        role: 'USER',
      });
    });
  });

  describe('Conta do próprio usuário', () => {
    const email = 'conta.e2e@empresa.com.br';
    let token: string;

    beforeAll(async () => {
      await http()
        .post('/users')
        .set(bearer(adminToken))
        .send({ name: 'Conta E2E', email, password: 'Senha@123' })
        .expect(201);
      token = await login(email, 'Senha@123');
    });

    it('PATCH /auth/profile atualiza o próprio nome', async () => {
      const { body } = await http()
        .patch('/auth/profile')
        .set(bearer(token))
        .send({ name: 'Conta Atualizada' })
        .expect(200);
      expect(body).toMatchObject({ name: 'Conta Atualizada', email });
    });

    it('PATCH /auth/profile não permite alterar o papel', async () => {
      await http()
        .patch('/auth/profile')
        .set(bearer(token))
        .send({ role: 'ADMIN' })
        .expect(400);
    });

    it('PATCH /auth/password troca a senha e invalida o token anterior', async () => {
      const { body } = await http()
        .patch('/auth/password')
        .set(bearer(token))
        .send({ currentPassword: 'Senha@123', newPassword: 'NovaSenha@456' })
        .expect(200);

      await http().get('/auth/me').set(bearer(token)).expect(401);

      token = (body as { accessToken: string }).accessToken;
      await http().get('/auth/me').set(bearer(token)).expect(200);
      await login(email, 'NovaSenha@456');
    });

    it('POST /auth/logout invalida o token', async () => {
      await http().post('/auth/logout').set(bearer(token)).expect(204);
      await http().get('/auth/me').set(bearer(token)).expect(401);
    });
  });

  describe('Usuários', () => {
    it('ADMIN lista usuários sem expor senhas', async () => {
      const { body } = await http()
        .get('/users')
        .set(bearer(adminToken))
        .expect(200);
      expect(body.meta.total).toBeGreaterThanOrEqual(2);
      for (const user of body.data) expect(user).not.toHaveProperty('password');
    });

    it('USER não acessa o gerenciamento de usuários', async () => {
      await http().get('/users').set(bearer(userToken)).expect(403);
    });

    it('valida os dados na criação', async () => {
      const { body } = await http()
        .post('/users')
        .set(bearer(adminToken))
        .send({ name: 'X', email: 'invalido', password: '123' })
        .expect(400);
      expect(Array.isArray(body.message)).toBe(true);
    });

    it('rejeita e-mail duplicado', async () => {
      await http()
        .post('/users')
        .set(bearer(adminToken))
        .send({
          name: 'Duplicado',
          email: 'KELLY@celke.com.br',
          password: 'Senha@123',
        })
        .expect(409);
    });

    it('usuário desativado não consegue fazer login', async () => {
      const { body: created } = await http()
        .post('/users')
        .set(bearer(adminToken))
        .send({
          name: 'Inativo',
          email: 'inativo@empresa.com.br',
          password: 'Senha@123',
        })
        .expect(201);

      await http()
        .patch(`/users/${created.id}/status`)
        .set(bearer(adminToken))
        .send({ active: false })
        .expect(200);

      await http()
        .post('/auth/login')
        .send({ email: 'inativo@empresa.com.br', password: 'Senha@123' })
        .expect(401);
    });
  });

  describe('Produtos', () => {
    let productId: number;

    it('cria um produto', async () => {
      const { body } = await http()
        .post('/products')
        .set(bearer(userToken))
        .send({ name: 'Produto E2E', code: 'e2e-001', unit: 'kg' })
        .expect(201);
      expect(body).toMatchObject({ code: 'E2E-001', unit: 'KG', active: true });
      productId = body.id;
    });

    it('busca produtos por nome ou código', async () => {
      const { body } = await http()
        .get('/products')
        .query({ search: 'E2E' })
        .set(bearer(userToken))
        .expect(200);
      expect(body.data).toHaveLength(1);
    });

    it('desativa um produto', async () => {
      const { body } = await http()
        .patch(`/products/${productId}/status`)
        .set(bearer(userToken))
        .send({ active: false })
        .expect(200);
      expect(body.active).toBe(false);
    });

    it('somente ADMIN exclui', async () => {
      await http()
        .delete(`/products/${productId}`)
        .set(bearer(userToken))
        .expect(403);
      await http()
        .delete(`/products/${productId}`)
        .set(bearer(adminToken))
        .expect(204);
      await http()
        .get(`/products/${productId}`)
        .set(bearer(adminToken))
        .expect(404);
    });
  });

  describe('Cotações', () => {
    it('cadastra uma cotação preservando a data informada', async () => {
      const { body } = await http()
        .post('/quotations')
        .set(bearer(userToken))
        .send({
          date: '2026-09-26',
          commodity: 'zinc',
          value: 2850.1234,
          currency: 'usd',
          unit: 't',
        })
        .expect(201);
      expect(body).toMatchObject({
        date: '2026-09-26',
        source: 'MANUAL',
        commodity: 'ZINC',
        value: 2850.1234,
        currency: 'USD',
      });
    });

    it('rejeita cotação duplicada', async () => {
      await http()
        .post('/quotations')
        .set(bearer(userToken))
        .send({
          date: '2026-09-26',
          commodity: 'ZINC',
          value: 1,
          currency: 'USD',
          unit: 'T',
        })
        .expect(409);
    });

    it('filtra por período e commodity', async () => {
      const { body } = await http()
        .get('/quotations')
        .query({
          commodity: 'copper',
          startDate: '2026-09-23',
          endDate: '2026-09-24',
        })
        .set(bearer(userToken))
        .expect(200);
      expect(body.data.map((q: { date: string }) => q.date)).toEqual([
        '2026-09-24',
        '2026-09-23',
      ]);
    });
  });

  describe('Fórmulas de precificação', () => {
    it('cria e consulta uma fórmula', async () => {
      const { body: created } = await http()
        .post('/pricing-formulas')
        .set(bearer(userToken))
        .send({ name: 'Fórmula E2E', description: 'Teste' })
        .expect(201);

      const { body } = await http()
        .get(`/pricing-formulas/${created.id}`)
        .set(bearer(userToken))
        .expect(200);
      expect(body).toMatchObject({ name: 'Fórmula E2E', active: true });
    });
  });

  it('GET /dashboard retorna os quatro cards', async () => {
    const { body } = await http()
      .get('/dashboard')
      .set(bearer(userToken))
      .expect(200);

    const values = Object.fromEntries(
      body.cards.map((card: { key: string; value: number }) => [
        card.key,
        card.value,
      ]),
    );
    expect(values).toEqual({
      users: 4, // 2 do seed + 2 criados nestes testes
      products: 5,
      quotations: 11,
      pricingFormulas: 4,
    });
  });
});
