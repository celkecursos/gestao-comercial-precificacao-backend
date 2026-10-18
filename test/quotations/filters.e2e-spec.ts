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

type QuotationBody = { id: number; date: string; source: string };

/**
 * Cobre: filtros de `GET /quotations` — commodity (normalizada), período
 * (`startDate`/`endDate` inclusivos, juntos ou sozinhos), fonte, ordenação por data
 * decrescente, paginação, período invertido (400 de regra) e data inválida (400).
 * Não cobre: montagem do filtro (unitário do service).
 * Dado criado: cotações da commodity `E2E-<STAMP>-FILTRO`.
 */
describe('Cotações — filtros', () => {
  const STAMP = stamp();
  const COMMODITY = `E2E-${STAMP}-FILTRO`;
  let app: INestApplication<App>;
  let userToken: string;
  const http = () => request(app.getHttpServer());

  const list = async (query: Record<string, string | number>) => {
    const { body } = await http()
      .get('/quotations')
      .query({ commodity: COMMODITY, ...query })
      .set(bearer(userToken))
      .expect(200);
    return body as {
      data: QuotationBody[];
      meta: { page: number; limit: number; total: number };
    };
  };
  const keys = (data: QuotationBody[]) =>
    data.map(({ date, source }) => `${date} ${source}`);

  beforeAll(async () => {
    app = await createTestApp();
    const adminToken = await login(app, SEED_ADMIN_EMAIL);
    userToken = await login(app, SEED_USER_EMAIL);

    for (const [date, source] of [
      ['2026-01-10', 'MANUAL'],
      ['2026-01-11', 'MANUAL'],
      ['2026-01-12', 'MANUAL'],
      ['2026-01-13', 'LME'],
    ]) {
      await http()
        .post('/quotations')
        .set(bearer(adminToken))
        .send({
          date,
          source,
          commodity: COMMODITY,
          value: 100,
          currency: 'USD',
          unit: 'T',
        })
        .expect(201);
    }
  });

  afterAll(async () => {
    await app.close();
  });

  it('commodity (em minúsculas) traz só as do arquivo, por data decrescente', async () => {
    const { data, meta } = await list({ commodity: COMMODITY.toLowerCase() });
    expect(meta.total).toBe(4);
    expect(keys(data)).toEqual([
      '2026-01-13 LME',
      '2026-01-12 MANUAL',
      '2026-01-11 MANUAL',
      '2026-01-10 MANUAL',
    ]);
  });

  it('período com startDate e endDate é inclusivo', async () => {
    const { data } = await list({
      startDate: '2026-01-11',
      endDate: '2026-01-12',
    });
    expect(keys(data)).toEqual(['2026-01-12 MANUAL', '2026-01-11 MANUAL']);
  });

  it('só startDate ou só endDate', async () => {
    expect(keys((await list({ startDate: '2026-01-12' })).data)).toEqual([
      '2026-01-13 LME',
      '2026-01-12 MANUAL',
    ]);
    expect(keys((await list({ endDate: '2026-01-10' })).data)).toEqual([
      '2026-01-10 MANUAL',
    ]);
  });

  it('source filtra pela fonte', async () => {
    const { data } = await list({ source: 'LME' });
    expect(keys(data)).toEqual(['2026-01-13 LME']);
  });

  it('pagina o resultado', async () => {
    const { data, meta } = await list({ page: 2, limit: 3 });
    expect(meta).toMatchObject({ page: 2, limit: 3, total: 4 });
    expect(keys(data)).toEqual(['2026-01-10 MANUAL']);
  });

  it('startDate maior que endDate → 400', async () => {
    const { body } = await http()
      .get('/quotations')
      .query({ startDate: '2026-01-12', endDate: '2026-01-10' })
      .set(bearer(userToken))
      .expect(400);
    expect(body).toMatchObject({
      statusCode: 400,
      message: 'startDate deve ser menor ou igual a endDate.',
      path: expect.stringContaining('/quotations'),
    });
  });

  it('rejeita filtro inválido (400 com lista de mensagens)', async () => {
    const { body } = await http()
      .get('/quotations')
      .query({ startDate: '10/01/2026', source: 'XYZ' })
      .set(bearer(userToken))
      .expect(400);
    expect(body.statusCode).toBe(400);
    expect(Array.isArray(body.message)).toBe(true);
  });
});
