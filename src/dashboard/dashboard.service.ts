import { Injectable } from '@nestjs/common';
import { PricingFormulasService } from '../pricing/pricing-formulas.service';
import { ProductsService } from '../products/products.service';
import { QuotationsService } from '../quotations/quotations.service';
import { UsersService } from '../users/users.service';
import {
  DashboardCardKey,
  DashboardResponseDto,
} from './dto/dashboard-response.dto';

/** Agrega indicadores dos demais módulos para os cards do dashboard. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly usersService: UsersService,
    private readonly productsService: ProductsService,
    private readonly quotationsService: QuotationsService,
    private readonly pricingFormulasService: PricingFormulasService,
  ) {}

  async getSummary(): Promise<DashboardResponseDto> {
    const [users, products, quotations, pricingFormulas] = await Promise.all([
      this.usersService.count(),
      this.productsService.count(),
      this.quotationsService.count(),
      this.pricingFormulasService.count(),
    ]);

    return {
      cards: [
        { key: DashboardCardKey.Users, title: 'Usuários', value: users },
        { key: DashboardCardKey.Products, title: 'Produtos', value: products },
        {
          key: DashboardCardKey.Quotations,
          title: 'Cotações',
          value: quotations,
        },
        {
          key: DashboardCardKey.PricingFormulas,
          title: 'Fórmulas de Precificação',
          value: pricingFormulas,
        },
      ],
      generatedAt: new Date().toISOString(),
    };
  }
}
