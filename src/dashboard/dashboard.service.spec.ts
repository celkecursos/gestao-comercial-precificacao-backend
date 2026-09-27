import { Test } from '@nestjs/testing';
import { PricingFormulasService } from '../pricing/pricing-formulas.service';
import { ProductsService } from '../products/products.service';
import { QuotationsService } from '../quotations/quotations.service';
import { UsersService } from '../users/users.service';
import { DashboardService } from './dashboard.service';
import { DashboardCardKey } from './dto/dashboard-response.dto';

describe('DashboardService', () => {
  let service: DashboardService;

  beforeEach(async () => {
    const counter = (total: number) => ({
      count: jest.fn().mockResolvedValue(total),
    });

    const moduleRef = await Test.createTestingModule({
      providers: [
        DashboardService,
        { provide: UsersService, useValue: counter(2) },
        { provide: ProductsService, useValue: counter(5) },
        { provide: QuotationsService, useValue: counter(10) },
        { provide: PricingFormulasService, useValue: counter(3) },
      ],
    }).compile();

    service = moduleRef.get(DashboardService);
  });

  it('retorna os quatro cards com os totais de cada módulo', async () => {
    const summary = await service.getSummary();

    expect(summary.cards).toEqual([
      { key: DashboardCardKey.Users, title: 'Usuários', value: 2 },
      { key: DashboardCardKey.Products, title: 'Produtos', value: 5 },
      { key: DashboardCardKey.Quotations, title: 'Cotações', value: 10 },
      {
        key: DashboardCardKey.PricingFormulas,
        title: 'Fórmulas de Precificação',
        value: 3,
      },
    ]);
    expect(new Date(summary.generatedAt).toString()).not.toBe('Invalid Date');
  });
});
