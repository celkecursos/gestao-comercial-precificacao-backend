import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { SWAGGER_PATH } from '../src/app.setup';
import { createTestApp } from './support/app';

type OpenApiDocument = {
  paths: Record<string, Record<string, { security?: object[] }>>;
  components: { securitySchemes?: Record<string, { scheme?: string }> };
};

/**
 * Cobre: o contrato OpenAPI em `/api/docs-json` — publicado sem token, com todas as rotas
 * dos controllers, o esquema Bearer e as rotas públicas sem exigência de token.
 * Não cobre: o conteúdo de cada schema (os DTOs têm unitário; as rotas, e2e por módulo).
 * Dado criado: nenhum.
 */
describe('Swagger — contrato OpenAPI', () => {
  let app: INestApplication<App>;
  let document: OpenApiDocument;

  beforeAll(async () => {
    app = await createTestApp();
    const { body } = await request(app.getHttpServer())
      .get(`/${SWAGGER_PATH}-json`)
      .expect(200);
    document = body as OpenApiDocument;
  });

  afterAll(async () => {
    await app.close();
  });

  it('documenta as rotas de todos os módulos', () => {
    const routes = Object.entries(document.paths).flatMap(([path, methods]) =>
      Object.keys(methods).map((method) => `${method.toUpperCase()} ${path}`),
    );
    expect(routes).toEqual(
      expect.arrayContaining([
        'POST /auth/login',
        'POST /auth/forgot-password',
        'POST /auth/reset-password',
        'POST /auth/logout',
        'GET /auth/me',
        'PATCH /auth/profile',
        'PATCH /auth/password',
        'GET /users',
        'POST /users',
        'GET /users/{id}',
        'PATCH /users/{id}',
        'DELETE /users/{id}',
        'PATCH /users/{id}/status',
        'GET /products',
        'POST /products',
        'GET /products/{id}',
        'PATCH /products/{id}',
        'DELETE /products/{id}',
        'PATCH /products/{id}/status',
        'GET /quotations',
        'POST /quotations',
        'GET /quotations/{id}',
        'PATCH /quotations/{id}',
        'DELETE /quotations/{id}',
        'GET /pricing-formulas',
        'POST /pricing-formulas',
        'GET /pricing-formulas/{id}',
        'PATCH /pricing-formulas/{id}',
        'DELETE /pricing-formulas/{id}',
        'PATCH /pricing-formulas/{id}/status',
        'GET /dashboard',
        'GET /health',
      ]),
    );
  });

  it('declara o esquema Bearer e o exige nas rotas privadas, não nas públicas', () => {
    expect(document.components.securitySchemes).toMatchObject({
      bearer: { scheme: 'bearer' },
    });

    expect(document.paths['/products'].get.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/auth/me'].get.security).toEqual([{ bearer: [] }]);
    expect(document.paths['/auth/login'].post.security).toBeUndefined();
    expect(document.paths['/health'].get.security).toBeUndefined();
  });
});
